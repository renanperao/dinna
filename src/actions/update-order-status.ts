"use server";

import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type Status =
  | "awaiting_payment"
  | "received"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

const STATUS_TIMESTAMPS: Partial<Record<Status, string>> = {
  received: "receivedAt",
  preparing: "preparingAt",
  ready: "readyAt",
  out_for_delivery: "outForDeliveryAt",
  delivered: "deliveredAt",
  cancelled: "cancelledAt",
};

export async function updateOrderStatus(orderId: string, status: Status, slug: string) {
  const tsField = STATUS_TIMESTAMPS[status];
  await db
    .update(orders)
    .set({
      status,
      ...(tsField ? { [tsField]: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  revalidatePath(`/kitchen/${slug}`);
  revalidatePath(`/admin/${slug}`, "layout");
}
