"use server";

import { db } from "@/lib/db";
import { customers, orders, orderItems, restaurants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/checkout";
import type { CartItem } from "@/stores/cart-store";

interface CreateOrderPayload {
  restaurantSlug: string;
  items: CartItem[];
  checkout: CheckoutInput;
  deliveryFee: number;
}

interface CreateOrderResult {
  success: true;
  orderId: string;
  orderNumber: number;
}
interface CreateOrderError {
  success: false;
  error: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<CreateOrderResult | CreateOrderError> {
  // Validate checkout input
  const parsed = checkoutSchema.safeParse(payload.checkout);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data = parsed.data;

  if (!payload.items || payload.items.length === 0) {
    return { success: false, error: "Carrinho vazio" };
  }

  // Fetch restaurant
  const [restaurant] = await db
    .select({ id: restaurants.id, minOrderValue: restaurants.minOrderValue })
    .from(restaurants)
    .where(eq(restaurants.slug, payload.restaurantSlug))
    .limit(1);

  if (!restaurant) {
    return { success: false, error: "Restaurante não encontrado" };
  }

  // Compute totals
  const subtotal = Number(
    payload.items
      .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
      .toFixed(2),
  );
  const deliveryFee = data.type === "delivery" ? payload.deliveryFee : 0;
  const total = Number((subtotal + deliveryFee).toFixed(2));
  const minOrder = Number(restaurant.minOrderValue ?? 0);

  if (subtotal < minOrder) {
    return {
      success: false,
      error: `Pedido mínimo de R$ ${minOrder.toFixed(2).replace(".", ",")}`,
    };
  }

  // Phone normalisation
  const rawPhone = data.phone.replace(/\D/g, "");
  const e164Phone = `+55${rawPhone}`;

  // Upsert customer
  let customerId: string | null = null;
  try {
    const existing = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.restaurantId, restaurant.id),
          eq(customers.phone, e164Phone),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      customerId = existing[0].id;
      await db
        .update(customers)
        .set({ name: data.name })
        .where(eq(customers.id, customerId));
    } else {
      const [newCustomer] = await db
        .insert(customers)
        .values({
          restaurantId: restaurant.id,
          phone: e164Phone,
          name: data.name,
        })
        .returning({ id: customers.id });
      customerId = newCustomer.id;
    }
  } catch {
    // non-blocking: proceed without customer linkage
  }

  // Build delivery address
  const deliveryAddress =
    data.type === "delivery"
      ? {
          street: data.street!,
          number: data.number!,
          complement: data.complement ?? "",
          neighborhood: data.neighborhood!,
          cep: data.cep!,
          reference: data.reference ?? "",
          city: "São Paulo",
          state: "SP",
        }
      : null;

  // Create order
  const [order] = await db
    .insert(orders)
    .values({
      restaurantId: restaurant.id,
      customerId: customerId ?? undefined,
      customerPhone: e164Phone,
      customerName: data.name,
      type: data.type,
      status: "received",
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      total: total.toFixed(2),
      deliveryAddress: deliveryAddress ?? undefined,
      paymentMethod: data.method,
      paymentStatus: data.method === "pix" ? "pending" : "pending",
      notes: data.notes ?? null,
      source: "website",
      receivedAt: new Date(),
    })
    .returning({ id: orders.id, number: orders.number });

  // Insert order items
  await db.insert(orderItems).values(
    payload.items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      productName: item.displayName,
      productType: item.productType,
      sizeName: item.sizeName ?? null,
      flavors: item.flavors?.map((f) => ({
        name: f.productName,
        percentage: f.percentage,
      })) ?? null,
      options:
        item.options.length > 0
          ? item.options.map((o) => ({
              group: o.groupName,
              name: o.name,
              price: o.priceDelta,
            }))
          : null,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      totalPrice: (item.unitPrice * item.quantity).toFixed(2),
      notes: item.notes ?? null,
    })),
  );

  return { success: true, orderId: order.id, orderNumber: order.number };
}
