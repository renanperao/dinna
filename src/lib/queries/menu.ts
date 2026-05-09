import "server-only";
import { db } from "@/lib/db";
import { eq, and, asc, inArray } from "drizzle-orm";
import {
  restaurants,
  categories,
  products,
  productSizes,
  productOptions,
  type Restaurant,
  type Category,
  type Product,
  type ProductSize,
  type ProductOption,
} from "@/lib/db/schema";

export type MenuProduct = Product & { sizes: ProductSize[] };
export type MenuCategory = Category & { products: MenuProduct[] };

export interface RestaurantMenu {
  restaurant: Restaurant;
  categories: MenuCategory[];
  options: ProductOption[];
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const rows = await db.select().from(restaurants).where(eq(restaurants.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getRestaurantMenu(slug: string): Promise<RestaurantMenu | null> {
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return null;

  const cats = await db
    .select()
    .from(categories)
    .where(and(eq(categories.restaurantId, restaurant.id), eq(categories.isActive, true)))
    .orderBy(asc(categories.displayOrder));

  const allProducts = await db
    .select()
    .from(products)
    .where(and(eq(products.restaurantId, restaurant.id), eq(products.isAvailable, true)))
    .orderBy(asc(products.displayOrder));

  const allSizes = allProducts.length
    ? await db
        .select()
        .from(productSizes)
        .where(
          inArray(
            productSizes.productId,
            allProducts.map((p) => p.id),
          ),
        )
        .orderBy(asc(productSizes.displayOrder))
    : [];

  const sizesByProduct = new Map<string, ProductSize[]>();
  for (const s of allSizes) {
    const list = sizesByProduct.get(s.productId) ?? [];
    list.push(s);
    sizesByProduct.set(s.productId, list);
  }

  const productsByCat = new Map<string, MenuProduct[]>();
  for (const p of allProducts) {
    if (!p.categoryId) continue;
    const list = productsByCat.get(p.categoryId) ?? [];
    list.push({ ...p, sizes: sizesByProduct.get(p.id) ?? [] });
    productsByCat.set(p.categoryId, list);
  }

  const options = await db
    .select()
    .from(productOptions)
    .where(and(eq(productOptions.restaurantId, restaurant.id), eq(productOptions.isActive, true)))
    .orderBy(asc(productOptions.groupName), asc(productOptions.displayOrder));

  const enrichedCategories: MenuCategory[] = cats
    .map((c) => ({ ...c, products: productsByCat.get(c.id) ?? [] }))
    .filter((c) => c.products.length > 0);

  return {
    restaurant,
    categories: enrichedCategories,
    options,
  };
}
