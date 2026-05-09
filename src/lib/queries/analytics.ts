import "server-only";
import { db } from "@/lib/db";
import { orders, orderItems, customers, categories, products } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc, asc } from "drizzle-orm";

/* ─── Revenue by day (last N days) ─── */
export async function getRevenueByDay(restaurantId: string, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      day: sql<string>`date_trunc('day', ${orders.createdAt} AT TIME ZONE 'America/Sao_Paulo')::date::text`,
      revenue: sql<number>`coalesce(sum(${orders.total}::numeric), 0)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gte(orders.createdAt, since),
      ),
    )
    .groupBy(sql`date_trunc('day', ${orders.createdAt} AT TIME ZONE 'America/Sao_Paulo')::date`)
    .orderBy(sql`date_trunc('day', ${orders.createdAt} AT TIME ZONE 'America/Sao_Paulo')::date`);

  // Fill gaps with 0
  const map = new Map(rows.map((r) => [r.day, r]));
  const result = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    result.push({
      day: key,
      label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" }),
      revenue: map.get(key)?.revenue ?? 0,
      count: map.get(key)?.count ?? 0,
    });
  }
  return result;
}

/* ─── Overall summary ─── */
export async function getSummaryStats(restaurantId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [today] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orders.total}::numeric),0)::float`,
    })
    .from(orders)
    .where(and(eq(orders.restaurantId, restaurantId), gte(orders.createdAt, todayStart)));

  const [week] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orders.total}::numeric),0)::float`,
    })
    .from(orders)
    .where(and(eq(orders.restaurantId, restaurantId), gte(orders.createdAt, weekStart)));

  const [month] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orders.total}::numeric),0)::float`,
    })
    .from(orders)
    .where(and(eq(orders.restaurantId, restaurantId), gte(orders.createdAt, monthStart)));

  const [totalCustomers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(eq(customers.restaurantId, restaurantId));

  return {
    today: today ?? { count: 0, revenue: 0 },
    week: week ?? { count: 0, revenue: 0 },
    month: month ?? { count: 0, revenue: 0 },
    totalCustomers: totalCustomers?.count ?? 0,
  };
}

/* ─── Product analytics by category ─── */
export interface CategoryAnalytics {
  categoryName: string;
  totalQty: number;
  avgPrice: number;
  totalRevenue: number;
  totalCost: number; // 0 in prototype
  profit: number;
  margin: number;
}

export async function getProductAnalytics(
  restaurantId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<CategoryAnalytics[]> {
  const start = startDate ?? (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
  const end = endDate ?? new Date();

  // Get orders in range
  const orderRows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
      ),
    );

  if (!orderRows.length) return [];

  const orderIds = orderRows.map((o) => o.id);

  // Get all items + join product for category
  const itemRows = await db
    .select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      productType: orderItems.productType,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      totalPrice: orderItems.totalPrice,
    })
    .from(orderItems)
    .where(sql`${orderItems.orderId} = ANY(${sql.raw(`ARRAY['${orderIds.join("','")}']::uuid[]`)})`);

  // Group by productType as category proxy
  const typeMap = new Map<string, { qty: number; revenue: number; prices: number[] }>();
  const typeLabels: Record<string, string> = {
    pizza: "Pizzas",
    beverage: "Bebidas",
    side: "Acompanhamentos",
    dessert: "Sobremesas",
    combo: "Combos",
    other: "Outros",
  };

  for (const item of itemRows) {
    const type = item.productType ?? "other";
    const entry = typeMap.get(type) ?? { qty: 0, revenue: 0, prices: [] };
    entry.qty += item.quantity;
    entry.revenue += Number(item.totalPrice);
    entry.prices.push(Number(item.unitPrice));
    typeMap.set(type, entry);
  }

  return [...typeMap.entries()]
    .map(([type, data]) => ({
      categoryName: typeLabels[type] ?? type,
      totalQty: data.qty,
      avgPrice: data.prices.length ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length : 0,
      totalRevenue: data.revenue,
      totalCost: 0,
      profit: data.revenue,
      margin: 100,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
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
