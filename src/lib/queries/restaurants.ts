import "server-only";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export interface RestaurantBrief {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  isActive: boolean;
}

export async function getAllRestaurants(): Promise<RestaurantBrief[]> {
  return db
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
}
