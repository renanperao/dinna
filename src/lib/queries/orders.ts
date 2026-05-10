import "server-only";
import { db } from "@/lib/db";
import { orders, orderItems, restaurants } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, inArray, sql, or, ilike } from "drizzle-orm";

export type OrderRow = typeof orders.$inferSelect;

export interface OrderFilter {
  status?: string;
  paymentMethod?: string;
  type?: string;
  search?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

const ALL_STATUSES = [
  "awaiting_payment",
  "received",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

const ALL_METHODS = [
  "pix",
  "credit",
  "debit",
  "cash",
  "meal_voucher",
  "on_delivery_card",
  "on_delivery_cash",
  "fiado",
] as const;

const ALL_TYPES = ["delivery", "pickup", "dine_in"] as const;

export async function getFilteredOrders(restaurantId: string, filter: OrderFilter = {}): Promise<OrderRow[]> {
  const where = [eq(orders.restaurantId, restaurantId)];

  if (filter.status && (ALL_STATUSES as readonly string[]).includes(filter.status)) {
    where.push(eq(orders.status, filter.status as (typeof ALL_STATUSES)[number]));
  }
  if (filter.paymentMethod && (ALL_METHODS as readonly string[]).includes(filter.paymentMethod)) {
    where.push(eq(orders.paymentMethod, filter.paymentMethod as (typeof ALL_METHODS)[number]));
  }
  if (filter.type && (ALL_TYPES as readonly string[]).includes(filter.type)) {
    where.push(eq(orders.type, filter.type as (typeof ALL_TYPES)[number]));
  }
  if (filter.from) where.push(gte(orders.createdAt, filter.from));
  if (filter.to) where.push(lte(orders.createdAt, filter.to));

  if (filter.search?.trim()) {
    const term = `%${filter.search.trim()}%`;
    const numeric = Number(filter.search.replace(/\D/g, ""));
    const conditions = [ilike(orders.customerName, term), ilike(orders.customerPhone, term)];
    if (Number.isFinite(numeric) && numeric > 0) {
      conditions.push(eq(orders.number, numeric));
    }
    const combined = or(...conditions);
    if (combined) where.push(combined);
  }

  return db
    .select()
    .from(orders)
    .where(and(...where))
    .orderBy(desc(orders.createdAt))
    .limit(filter.limit ?? 200);
}

export type OrderWithItems = {
  id: string;
  number: number;
  customerName: string;
  customerPhone: string;
  type: string;
  status: string;
  paymentMethod: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  notes: string | null;
  deliveryAddress: unknown;
  receivedAt: Date | null;
  createdAt: Date;
  items: {
    id: string;
    productName: string;
    sizeName: string | null;
    flavors: unknown;
    options: unknown;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    notes: string | null;
  }[];
};

export async function getRestaurantIdBySlug(slug: string): Promise<string | null> {
  const rows = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function getOrdersForKDS(restaurantId: string): Promise<OrderWithItems[]> {
  const activeStatuses = ["received", "preparing", "ready", "out_for_delivery"] as (
    | "received"
    | "preparing"
    | "ready"
    | "out_for_delivery"
  )[];
  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        inArray(orders.status, activeStatuses),
      ),
    )
    .orderBy(orders.createdAt);

  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, ids));

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  return rows.map((o) => ({
    id: o.id,
    number: o.number,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    type: o.type,
    status: o.status,
    paymentMethod: o.paymentMethod,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee ?? "0",
    total: o.total,
    notes: o.notes,
    deliveryAddress: o.deliveryAddress,
    receivedAt: o.receivedAt,
    createdAt: o.createdAt,
    items: (itemsByOrder.get(o.id) ?? []).map((i) => ({
      id: i.id,
      productName: i.productName,
      sizeName: i.sizeName,
      flavors: i.flavors,
      options: i.options,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      notes: i.notes,
    })),
  }));
}

export async function getAdminStats(restaurantId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(total::numeric), 0)::float`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gte(orders.createdAt, todayStart),
      ),
    );

  const pendingCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
    inArray(orders.status, ["received", "preparing"] as ("received" | "preparing")[]),
      ),
    );

  const recentOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.restaurantId, restaurantId))
    .orderBy(desc(orders.createdAt))
    .limit(20);

  return {
    todayCount: todayOrders[0]?.count ?? 0,
    todayRevenue: todayOrders[0]?.revenue ?? 0,
    pendingCount: pendingCount[0]?.count ?? 0,
    avgTicket:
      (todayOrders[0]?.count ?? 0) > 0
        ? (todayOrders[0]?.revenue ?? 0) / (todayOrders[0]?.count ?? 1)
        : 0,
    recentOrders,
  };
}
