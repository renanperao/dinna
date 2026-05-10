"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { coupons, restaurants } from "@/lib/db/schema";

const couponSchema = z.object({
  code: z
    .string()
    .min(2, "Código muito curto")
    .max(20, "Código muito longo")
    .regex(/^[A-Z0-9_-]+$/i, "Use apenas letras, números, _ ou -"),
  discountType: z.enum(["percentage", "fixed", "free_delivery"]),
  discountValue: z.number().min(0).max(100000),
  minOrderValue: z.number().min(0).optional().nullable(),
  maxUses: z.number().int().min(1).optional().nullable(),
  validUntil: z.string().optional().nullable(),
  description: z.string().max(200).optional().nullable(),
});

export type CouponInput = z.infer<typeof couponSchema>;

export type CouponResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createCoupon(slug: string, raw: CouponInput): Promise<CouponResult> {
  const parsed = couponSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, error: "Dados inválidos", fieldErrors };
  }

  const restaurant = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);
  if (!restaurant[0]) return { ok: false, error: "Restaurante não encontrado" };

  const data = parsed.data;
  const code = data.code.toUpperCase();

  const existing = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(and(eq(coupons.restaurantId, restaurant[0].id), eq(coupons.code, code)))
    .limit(1);
  if (existing[0]) {
    return {
      ok: false,
      error: "Já existe um cupom com esse código",
      fieldErrors: { code: "Código já em uso" },
    };
  }

  await db.insert(coupons).values({
    restaurantId: restaurant[0].id,
    code,
    description: data.description ?? null,
    discountType: data.discountType,
    discountValue: data.discountValue.toFixed(2),
    minOrderValue: data.minOrderValue != null ? data.minOrderValue.toFixed(2) : null,
    maxUses: data.maxUses ?? null,
    validUntil: data.validUntil ? new Date(data.validUntil) : null,
    isActive: true,
  });

  revalidatePath(`/admin/${slug}/coupons`);
  return { ok: true };
}

export async function toggleCoupon(slug: string, couponId: string): Promise<CouponResult> {
  const restaurant = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);
  if (!restaurant[0]) return { ok: false, error: "Restaurante não encontrado" };

  const current = await db
    .select({ isActive: coupons.isActive })
    .from(coupons)
    .where(and(eq(coupons.id, couponId), eq(coupons.restaurantId, restaurant[0].id)))
    .limit(1);
  if (!current[0]) return { ok: false, error: "Cupom não encontrado" };

  await db
    .update(coupons)
    .set({ isActive: !(current[0].isActive ?? true) })
    .where(and(eq(coupons.id, couponId), eq(coupons.restaurantId, restaurant[0].id)));

  revalidatePath(`/admin/${slug}/coupons`);
  return { ok: true };
}

export async function deleteCoupon(slug: string, couponId: string): Promise<CouponResult> {
  const restaurant = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);
  if (!restaurant[0]) return { ok: false, error: "Restaurante não encontrado" };

  await db
    .delete(coupons)
    .where(and(eq(coupons.id, couponId), eq(coupons.restaurantId, restaurant[0].id)));

  revalidatePath(`/admin/${slug}/coupons`);
  return { ok: true };
}
