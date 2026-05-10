import "server-only";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export interface RestaurantBrief {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  isActive: boolean;
}

export async function getAllRestaurants(): Promise<RestaurantBrief[]> {
  const rows = await db
    .select({
      id: restaurants.id,
      slug: restaurants.slug,
      name: restaurants.name,
      logoUrl: restaurants.logoUrl,
      primaryColor: restaurants.primaryColor,
      isActive: restaurants.isActive,
    })
    .from(restaurants)
    .orderBy(asc(restaurants.name));

  return rows.map((r) => ({ ...r, isActive: r.isActive ?? true }));
}
