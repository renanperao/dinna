import "server-only";
import { db } from "@/lib/db";
import { orders, orderItems, customers, categories, products } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

const TZ = "America/Sao_Paulo";
// Inlined as a SQL literal so identical TZ-dependent expressions in SELECT and
// GROUP BY produce textually identical SQL (otherwise Drizzle emits a separate
// $N parameter per occurrence and Postgres rejects the GROUP BY match).
const TZ_SQL = sql.raw(`'${TZ}'`);

/** Returns YYYY-MM-DD as seen in the São Paulo timezone, regardless of host clock. */
const dayKeyTZ = (() => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return (d: Date) => fmt.format(d); // returns YYYY-MM-DD
})();

/* ─── Period helpers ─── */
export type PeriodKey = "7d" | "30d" | "month";

export interface PeriodRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  days: number;
  label: string;
}

export function resolvePeriod(period: PeriodKey): PeriodRange {
  const now = new Date();
  const end = new Date(now);

  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const days = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / 86_400_000));
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    return { start, end, prevStart, prevEnd, days, label: "Este mês" };
  }

  const days = period === "7d" ? 7 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - days);
  return { start, end, prevStart, prevEnd, days, label: `${days} dias` };
}

/* ─── Revenue by day (last N days), with previous period totals ─── */
export interface RevenuePoint {
  day: string;
  label: string;
  revenue: number;
  count: number;
}

export interface RevenueByDayResult {
  current: RevenuePoint[];
  previousTotal: { revenue: number; count: number };
  currentTotal: { revenue: number; count: number };
}

export async function getRevenueByDay(
  restaurantId: string,
  daysOrPeriod: number | PeriodKey = 7,
): Promise<RevenueByDayResult> {
  const period: PeriodRange =
    typeof daysOrPeriod === "number"
      ? resolvePeriod((daysOrPeriod === 30 ? "30d" : "7d") as PeriodKey)
      : resolvePeriod(daysOrPeriod);

  const rows = await db
    .select({
      day: sql<string>`date_trunc('day', ${orders.createdAt} AT TIME ZONE ${TZ_SQL})::date::text`,
      revenue: sql<number>`coalesce(sum(${orders.total}::numeric), 0)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(eq(orders.restaurantId, restaurantId), gte(orders.createdAt, period.start)))
    .groupBy(sql`date_trunc('day', ${orders.createdAt} AT TIME ZONE ${TZ_SQL})::date`)
    .orderBy(sql`date_trunc('day', ${orders.createdAt} AT TIME ZONE ${TZ_SQL})::date`);

  const map = new Map(rows.map((r) => [r.day, r]));
  const current: RevenuePoint[] = [];
  for (let i = 0; i < period.days; i++) {
    const d = new Date(period.start);
    d.setDate(d.getDate() + i);
    const key = dayKeyTZ(d);
    const entry = map.get(key);
    current.push({
      day: key,
      label: d.toLocaleDateString("pt-BR", {
        weekday: period.days <= 7 ? "short" : undefined,
        day: "numeric",
        month: period.days > 7 ? "short" : undefined,
        timeZone: TZ,
      }),
      revenue: entry?.revenue ?? 0,
      count: entry?.count ?? 0,
    });
  }

  const [prev] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.total}::numeric), 0)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gte(orders.createdAt, period.prevStart),
        lte(orders.createdAt, period.prevEnd),
      ),
    );

  const currentTotal = current.reduce(
    (acc, p) => ({ revenue: acc.revenue + p.revenue, count: acc.count + p.count }),
    { revenue: 0, count: 0 },
  );

  return {
    current,
    previousTotal: { revenue: prev?.revenue ?? 0, count: prev?.count ?? 0 },
    currentTotal,
  };
}

/* ─── Orders by hour (today) ─── */
export interface HourlyPoint {
  hour: number;
  count: number;
}

export async function getOrdersByHourToday(restaurantId: string): Promise<HourlyPoint[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      hour: sql<number>`extract(hour from ${orders.createdAt} AT TIME ZONE ${TZ_SQL})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(eq(orders.restaurantId, restaurantId), gte(orders.createdAt, start)))
    .groupBy(sql`extract(hour from ${orders.createdAt} AT TIME ZONE ${TZ_SQL})`);

  const map = new Map(rows.map((r) => [Number(r.hour), r.count]));
  const result: HourlyPoint[] = [];
  for (let h = 0; h < 24; h++) {
    result.push({ hour: h, count: map.get(h) ?? 0 });
  }
  return result;
}

/* ─── Overall summary with period comparison ─── */
export interface PeriodTotals {
  count: number;
  revenue: number;
}

export interface SummaryStats {
  today: PeriodTotals;
  yesterday: PeriodTotals;
  week: PeriodTotals;
  prevWeek: PeriodTotals;
  month: PeriodTotals;
  prevMonth: PeriodTotals;
  totalCustomers: number;
  newCustomersThisMonth: number;
  newCustomersPrevMonth: number;
}

async function totalsBetween(restaurantId: string, start: Date, end?: Date): Promise<PeriodTotals> {
  const conditions = [eq(orders.restaurantId, restaurantId), gte(orders.createdAt, start)];
  if (end) conditions.push(lte(orders.createdAt, end));
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orders.total}::numeric),0)::float`,
    })
    .from(orders)
    .where(and(...conditions));
  return { count: row?.count ?? 0, revenue: row?.revenue ?? 0 };
}

export async function getSummaryStats(restaurantId: string): Promise<SummaryStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart.getTime() - 1);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(weekStart.getTime() - 1);

  const monthStart = new Date(todayStart);
  monthStart.setDate(1);

  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
  const prevMonthEnd = new Date(monthStart.getTime() - 1);

  const [today, yesterday, week, prevWeek, month, prevMonth] = await Promise.all([
    totalsBetween(restaurantId, todayStart),
    totalsBetween(restaurantId, yesterdayStart, yesterdayEnd),
    totalsBetween(restaurantId, weekStart),
    totalsBetween(restaurantId, prevWeekStart, prevWeekEnd),
    totalsBetween(restaurantId, monthStart),
    totalsBetween(restaurantId, prevMonthStart, prevMonthEnd),
  ]);

  const [totalCustomers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(eq(customers.restaurantId, restaurantId));

  const [newThisMonth] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(and(eq(customers.restaurantId, restaurantId), gte(customers.createdAt, monthStart)));

  const [newPrevMonth] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(
      and(
        eq(customers.restaurantId, restaurantId),
        gte(customers.createdAt, prevMonthStart),
        lte(customers.createdAt, prevMonthEnd),
      ),
    );

  return {
    today,
    yesterday,
    week,
    prevWeek,
    month,
    prevMonth,
    totalCustomers: totalCustomers?.count ?? 0,
    newCustomersThisMonth: newThisMonth?.count ?? 0,
    newCustomersPrevMonth: newPrevMonth?.count ?? 0,
  };
}

/* ─── Product analytics by REAL category (joined) ─── */
export interface CategoryAnalytics {
  categoryId: string | null;
  categoryName: string;
  totalQty: number;
  avgPrice: number;
  totalRevenue: number;
}

export async function getProductAnalytics(
  restaurantId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<CategoryAnalytics[]> {
  const start = startDate ?? (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
  const end = endDate ?? new Date();

  const rows = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      productType: orderItems.productType,
      quantity: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<number>`coalesce(sum(${orderItems.totalPrice}::numeric), 0)::float`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
      ),
    )
    .groupBy(categories.id, categories.name, orderItems.productType);

  const typeFallback: Record<string, string> = {
    pizza: "Pizzas (sem categoria)",
    beverage: "Bebidas (sem categoria)",
    side: "Acompanhamentos (sem categoria)",
    dessert: "Sobremesas (sem categoria)",
    combo: "Combos (sem categoria)",
    other: "Outros (sem categoria)",
  };

  // group by categoryId|name (categoryId being null is grouped per productType)
  const merged = new Map<string, CategoryAnalytics>();
  for (const r of rows) {
    const key = r.categoryId ?? `__null:${r.productType ?? "other"}`;
    const name = r.categoryName ?? typeFallback[r.productType ?? "other"] ?? "Sem categoria";
    const entry = merged.get(key) ?? {
      categoryId: r.categoryId,
      categoryName: name,
      totalQty: 0,
      avgPrice: 0,
      totalRevenue: 0,
    };
    entry.totalQty += r.quantity ?? 0;
    entry.totalRevenue += r.revenue ?? 0;
    merged.set(key, entry);
  }

  // Weighted average unit price = revenue / quantity (revenue already = unitPrice * quantity)
  for (const entry of merged.values()) {
    entry.avgPrice = entry.totalQty > 0 ? entry.totalRevenue / entry.totalQty : 0;
  }

  return [...merged.values()].sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/* ─── Customer list ─── */
export interface CustomerRow {
  id: string;
  name: string | null;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  avgTicket: number;
  lastOrderAt: Date | null;
  createdAt: Date;
}

export async function getCustomerList(restaurantId: string): Promise<CustomerRow[]> {
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      totalOrders: sql<number>`count(${orders.id})::int`,
      totalSpent: sql<number>`coalesce(sum(${orders.total}::numeric),0)::float`,
      avgTicket: sql<number>`coalesce(avg(${orders.total}::numeric),0)::float`,
      lastOrderAt: sql<Date>`max(${orders.createdAt})`,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(eq(customers.restaurantId, restaurantId))
    .groupBy(customers.id)
    .orderBy(desc(sql`coalesce(sum(${orders.total}::numeric),0)`));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    totalOrders: r.totalOrders ?? 0,
    totalSpent: r.totalSpent ?? 0,
    avgTicket: r.avgTicket ?? 0,
    lastOrderAt: r.lastOrderAt ? new Date(r.lastOrderAt) : null,
    createdAt: new Date(r.createdAt),
  }));
}

/* ─── Payment method breakdown ─── */
export async function getPaymentBreakdown(restaurantId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({
      method: orders.paymentMethod,
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orders.total}::numeric),0)::float`,
    })
    .from(orders)
    .where(and(eq(orders.restaurantId, restaurantId), gte(orders.createdAt, since)))
    .groupBy(orders.paymentMethod)
    .orderBy(desc(sql`sum(${orders.total}::numeric)`));

  return rows;
}

/* ─── Cancellation stats over a real period ─── */
export interface CancellationStats {
  totalOrders: number;
  cancelledCount: number;
  ratePct: number;
  lostRevenue: number;
  cancelledOrders: Array<{
    id: string;
    number: number;
    customerName: string;
    total: string;
    cancelledAt: Date | null;
    cancelledReason: string | null;
    createdAt: Date;
  }>;
}

export async function getCancellationStats(
  restaurantId: string,
  days = 30,
): Promise<CancellationStats> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      cancelled: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')::int`,
      lost: sql<number>`coalesce(sum(${orders.total}::numeric) filter (where ${orders.status} = 'cancelled'), 0)::float`,
    })
    .from(orders)
    .where(and(eq(orders.restaurantId, restaurantId), gte(orders.createdAt, since)));

  const cancelledOrders = await db
    .select({
      id: orders.id,
      number: orders.number,
      customerName: orders.customerName,
      total: orders.total,
      cancelledAt: orders.cancelledAt,
      cancelledReason: orders.cancelledReason,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gte(orders.createdAt, since),
        eq(orders.status, "cancelled"),
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(50);

  const totalOrders = totals?.total ?? 0;
  const cancelledCount = totals?.cancelled ?? 0;

  return {
    totalOrders,
    cancelledCount,
    ratePct: totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0,
    lostRevenue: totals?.lost ?? 0,
    cancelledOrders,
  };
}

/* ─── Customer analytics dashboard ─── */
export interface CustomerInsights {
  totals: {
    total: number;
    activeInPeriod: number;
    newInPeriod: number;
    recurringInPeriod: number;
    inactiveOver30d: number;
  };
  comparison: {
    previousNew: number;
    previousActive: number;
  };
  newVsRecurringByDay: Array<{
    label: string;
    newCustomers: number;
    recurring: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string | null;
    phone: string;
    totalOrders: number;
    totalSpent: number;
    avgTicket: number;
    lastOrderAt: Date | null;
  }>;
  inactiveCustomers: Array<{
    id: string;
    name: string | null;
    phone: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderAt: Date | null;
    daysSinceLastOrder: number;
  }>;
}

export async function getCustomerInsights(
  restaurantId: string,
  period: PeriodKey = "30d",
): Promise<CustomerInsights> {
  const range = resolvePeriod(period);

  // 1. Totais agregados de clientes
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(eq(customers.restaurantId, restaurantId));

  // 2. Clientes ativos no período (que fizeram pedido)
  const [activeRow] = await db
    .select({
      count: sql<number>`count(distinct ${orders.customerId})::int`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gte(orders.createdAt, range.start),
        sql`${orders.customerId} is not null`,
      ),
    );

  const [prevActiveRow] = await db
    .select({
      count: sql<number>`count(distinct ${orders.customerId})::int`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gte(orders.createdAt, range.prevStart),
        lte(orders.createdAt, range.prevEnd),
        sql`${orders.customerId} is not null`,
      ),
    );

  // 3. Novos clientes no período
  const [newRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(
      and(eq(customers.restaurantId, restaurantId), gte(customers.createdAt, range.start)),
    );

  const [prevNewRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(
      and(
        eq(customers.restaurantId, restaurantId),
        gte(customers.createdAt, range.prevStart),
        lte(customers.createdAt, range.prevEnd),
      ),
    );

  const newCount = newRow?.count ?? 0;
  const activeCount = activeRow?.count ?? 0;
  const recurringCount = Math.max(0, activeCount - newCount);

  // 4. Inativos (com pedidos antes, sem pedido nos últimos 30 dias)
  const cutoff30d = new Date();
  cutoff30d.setDate(cutoff30d.getDate() - 30);

  const [inactiveRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(
      and(
        eq(customers.restaurantId, restaurantId),
        sql`${customers.lastOrderAt} is not null`,
        lte(customers.lastOrderAt, cutoff30d),
      ),
    );

  // 5. Série diária novos vs recorrentes
  const dailyRows = await db
    .select({
      day: sql<string>`date_trunc('day', ${orders.createdAt} AT TIME ZONE ${TZ_SQL})::date::text`,
      customerId: orders.customerId,
      customerCreatedAt: customers.createdAt,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gte(orders.createdAt, range.start),
        sql`${orders.customerId} is not null`,
      ),
    );

  const dayMap = new Map<string, { newC: Set<string>; rec: Set<string> }>();
  for (const r of dailyRows) {
    if (!r.customerId) continue;
    const day = r.day;
    const entry = dayMap.get(day) ?? { newC: new Set(), rec: new Set() };
    const isNew =
      r.customerCreatedAt && new Date(r.customerCreatedAt).getTime() >= range.start.getTime();
    if (isNew) entry.newC.add(r.customerId);
    else entry.rec.add(r.customerId);
    dayMap.set(day, entry);
  }

  const newVsRecurringByDay: CustomerInsights["newVsRecurringByDay"] = [];
  for (let i = 0; i < range.days; i++) {
    const d = new Date(range.start);
    d.setDate(d.getDate() + i);
    const key = dayKeyTZ(d);
    const entry = dayMap.get(key);
    newVsRecurringByDay.push({
      label: d.toLocaleDateString("pt-BR", {
        weekday: range.days <= 7 ? "short" : undefined,
        day: "numeric",
        month: range.days > 7 ? "short" : undefined,
        timeZone: TZ,
      }),
      newCustomers: entry?.newC.size ?? 0,
      recurring: entry?.rec.size ?? 0,
    });
  }

  // 6. Top 10 clientes por LTV
  const topRows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      totalOrders: sql<number>`count(${orders.id})::int`,
      totalSpent: sql<number>`coalesce(sum(${orders.total}::numeric),0)::float`,
      avgTicket: sql<number>`coalesce(avg(${orders.total}::numeric),0)::float`,
      lastOrderAt: sql<Date>`max(${orders.createdAt})`,
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(eq(customers.restaurantId, restaurantId))
    .groupBy(customers.id)
    .orderBy(desc(sql`coalesce(sum(${orders.total}::numeric),0)`))
    .limit(10);

  // 7. Inativos detalhados
  const inactiveRows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      totalOrders: customers.totalOrders,
      totalSpent: customers.totalSpent,
      lastOrderAt: customers.lastOrderAt,
    })
    .from(customers)
    .where(
      and(
        eq(customers.restaurantId, restaurantId),
        sql`${customers.lastOrderAt} is not null`,
        lte(customers.lastOrderAt, cutoff30d),
      ),
    )
    .orderBy(desc(customers.totalSpent))
    .limit(20);

  const now = Date.now();

  return {
    totals: {
      total: totalRow?.count ?? 0,
      activeInPeriod: activeCount,
      newInPeriod: newCount,
      recurringInPeriod: recurringCount,
      inactiveOver30d: inactiveRow?.count ?? 0,
    },
    comparison: {
      previousActive: prevActiveRow?.count ?? 0,
      previousNew: prevNewRow?.count ?? 0,
    },
    newVsRecurringByDay,
    topCustomers: topRows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      totalOrders: r.totalOrders ?? 0,
      totalSpent: r.totalSpent ?? 0,
      avgTicket: r.avgTicket ?? 0,
      lastOrderAt: r.lastOrderAt ? new Date(r.lastOrderAt) : null,
    })),
    inactiveCustomers: inactiveRows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      totalOrders: r.totalOrders ?? 0,
      totalSpent: Number(r.totalSpent ?? 0),
      lastOrderAt: r.lastOrderAt ? new Date(r.lastOrderAt) : null,
      daysSinceLastOrder: r.lastOrderAt
        ? Math.floor((now - new Date(r.lastOrderAt).getTime()) / 86_400_000)
        : 0,
    })),
  };
}

/* ─── Heatmap day × hour (últimos N dias) ─── */
export interface HeatmapResult {
  matrix: number[][]; // [day 0=sun..6=sat][hour 0..23]
  maxValue: number;
  totalOrders: number;
}

export async function getHeatmap(restaurantId: string, days = 30): Promise<HeatmapResult> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      dow: sql<number>`extract(dow from ${orders.createdAt} AT TIME ZONE ${TZ_SQL})::int`,
      hour: sql<number>`extract(hour from ${orders.createdAt} AT TIME ZONE ${TZ_SQL})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(eq(orders.restaurantId, restaurantId), gte(orders.createdAt, since)))
    .groupBy(
      sql`extract(dow from ${orders.createdAt} AT TIME ZONE ${TZ_SQL})`,
      sql`extract(hour from ${orders.createdAt} AT TIME ZONE ${TZ_SQL})`,
    );

  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let maxValue = 0;
  let totalOrders = 0;
  for (const r of rows) {
    const dow = Number(r.dow);
    const hour = Number(r.hour);
    if (dow >= 0 && dow < 7 && hour >= 0 && hour < 24) {
      matrix[dow][hour] = r.count;
      if (r.count > maxValue) maxValue = r.count;
      totalOrders += r.count;
    }
  }

  return { matrix, maxValue, totalOrders };
}

/* ─── ABC curve por produto ─── */
export interface ProductABCRow {
  productId: string | null;
  productName: string;
  quantity: number;
  revenue: number;
  cumulativePct: number;
  classification: "A" | "B" | "C";
}

export async function getProductABC(
  restaurantId: string,
  days = 30,
): Promise<{ rows: ProductABCRow[]; totalRevenue: number }> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      quantity: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<number>`coalesce(sum(${orderItems.totalPrice}::numeric), 0)::float`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.restaurantId, restaurantId), gte(orders.createdAt, since)))
    .groupBy(orderItems.productId, orderItems.productName)
    .orderBy(desc(sql`coalesce(sum(${orderItems.totalPrice}::numeric), 0)`));

  const totalRevenue = rows.reduce((s, r) => s + (r.revenue ?? 0), 0);
  let cumulative = 0;
  const enriched: ProductABCRow[] = rows.map((r) => {
    // Classification uses cumulative BEFORE this product so that the product
    // that crosses the 80% / 95% boundary still belongs to the lower class
    // (which is the standard ABC convention).
    const prevPct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
    cumulative += r.revenue ?? 0;
    const cumulativePct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
    let classification: "A" | "B" | "C" = "C";
    if (prevPct < 80) classification = "A";
    else if (prevPct < 95) classification = "B";
    return {
      productId: r.productId,
      productName: r.productName,
      quantity: r.quantity ?? 0,
      revenue: r.revenue ?? 0,
      cumulativePct,
      classification,
    };
  });

  return { rows: enriched, totalRevenue };
}
