import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

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
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.restaurantId, restaurantId))
    .orderBy(users.createdAt);

  return rows.map((r) => ({
    ...r,
    role: r.role as TeamMember["role"],
  }));
}
