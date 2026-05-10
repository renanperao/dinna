"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { products, productSizes, categories, restaurants } from "@/lib/db/schema";

const PIZZA_SIZE_DELTAS = [
  { name: "P", diameterCm: 25, slices: 4, maxFlavors: 1, delta: 0 },
  { name: "M", diameterCm: 30, slices: 6, maxFlavors: 2, delta: 12 },
  { name: "G", diameterCm: 35, slices: 8, maxFlavors: 2, delta: 24 },
  { name: "GG", diameterCm: 40, slices: 12, maxFlavors: 4, delta: 38 },
];

const productSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  type: z.enum(["pizza", "beverage", "side", "dessert", "combo", "other"]),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().or(z.literal("")).optional().nullable(),
  basePrice: z.number().min(0).max(100000),
});

export type ProductInput = z.infer<typeof productSchema>;

export type ProductResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function findRestaurant(slug: string) {
  const rows = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function toggleProductAvailability(
  slug: string,
  productId: string,
): Promise<ProductResult> {
  const restaurant = await findRestaurant(slug);
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado" };

  const current = await db
    .select({ isAvailable: products.isAvailable })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.restaurantId, restaurant.id)))
    .limit(1);
  if (!current[0]) return { ok: false, error: "Produto não encontrado" };

  await db
    .update(products)
    .set({ isAvailable: !(current[0].isAvailable ?? true), updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.restaurantId, restaurant.id)));

  revalidatePath(`/admin/${slug}/menu`);
  revalidatePath(`/${slug}`);
  return { ok: true };
}

export async function createProduct(slug: string, raw: ProductInput): Promise<ProductResult> {
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, error: "Dados inválidos", fieldErrors };
  }

  const restaurant = await findRestaurant(slug);
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado" };

  const data = parsed.data;
  const isPizza = data.type === "pizza";

  const [inserted] = await db
    .insert(products)
    .values({
      restaurantId: restaurant.id,
      categoryId: data.categoryId ?? null,
      type: data.type,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      basePrice: isPizza ? null : data.basePrice.toFixed(2),
      isAvailable: true,
      isFeatured: false,
    })
    .returning({ id: products.id });

  // For pizzas, auto-create the 4 standard sizes from the base price
  if (isPizza && inserted) {
    await db.insert(productSizes).values(
      PIZZA_SIZE_DELTAS.map((s, i) => ({
        productId: inserted.id,
        name: s.name,
        diameterCm: s.diameterCm,
        slices: s.slices,
        maxFlavors: s.maxFlavors,
        price: (data.basePrice + s.delta).toFixed(2),
        displayOrder: i,
      })),
    );
  }

  revalidatePath(`/admin/${slug}/menu`);
  revalidatePath(`/${slug}`);
  return { ok: true };
}

const updateSchema = productSchema.partial().extend({ id: z.string().uuid() });
export type ProductUpdateInput = z.infer<typeof updateSchema>;

export async function updateProduct(
  slug: string,
  raw: ProductUpdateInput,
): Promise<ProductResult> {
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, error: "Dados inválidos", fieldErrors };
  }

  const restaurant = await findRestaurant(slug);
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado" };

  const data = parsed.data;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.description !== undefined) patch.description = data.description?.trim() || null;
  if (data.imageUrl !== undefined) patch.imageUrl = data.imageUrl?.trim() || null;
  if (data.categoryId !== undefined) patch.categoryId = data.categoryId ?? null;
  if (data.basePrice !== undefined) patch.basePrice = data.basePrice.toFixed(2);

  await db
    .update(products)
    .set(patch)
    .where(and(eq(products.id, data.id), eq(products.restaurantId, restaurant.id)));

  revalidatePath(`/admin/${slug}/menu`);
  revalidatePath(`/${slug}`);
  return { ok: true };
}

export async function deleteProduct(slug: string, productId: string): Promise<ProductResult> {
  const restaurant = await findRestaurant(slug);
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado" };

  await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.restaurantId, restaurant.id)));

  revalidatePath(`/admin/${slug}/menu`);
  revalidatePath(`/${slug}`);
  return { ok: true };
}

export interface CategoryOption {
  id: string;
  name: string;
}

export async function listCategoriesForSelect(slug: string): Promise<CategoryOption[]> {
  const restaurant = await findRestaurant(slug);
  if (!restaurant) return [];
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.restaurantId, restaurant.id))
    .orderBy(categories.displayOrder);
}
