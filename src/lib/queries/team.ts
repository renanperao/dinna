import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, userRestaurants } from "@/lib/db/schema";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "operator" | "kitchen" | "delivery";
  isActive: boolean | null;
  createdAt: Date;
};

export async function getTeamMembers(restaurantId: string): Promise<TeamMember[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: userRestaurants.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(userRestaurants)
    .innerJoin(users, eq(users.id, userRestaurants.userId))
    .where(eq(userRestaurants.restaurantId, restaurantId))
    .orderBy(users.createdAt);

  return rows.map((r) => ({
    ...r,
    role: r.role as TeamMember["role"],
  }));
}
