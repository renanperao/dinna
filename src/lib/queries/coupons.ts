import "server-only";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export type CouponRow = typeof coupons.$inferSelect;

export async function getCoupons(restaurantId: string): Promise<CouponRow[]> {
  return db
    .select()
    .from(coupons)
    .where(eq(coupons.restaurantId, restaurantId))
    .orderBy(desc(coupons.isActive), desc(coupons.id));
}
