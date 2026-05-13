"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, userRestaurants, restaurants } from "@/lib/db/schema";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { findMembership, getSession } from "@/lib/auth";

export type TeamActionResult =
  | { ok: true }
  | { ok: false; error: string };

const INVITABLE_ROLES = ["operator", "kitchen", "delivery"] as const;
type InvitableRole = (typeof INVITABLE_ROLES)[number];

type OwnerCheck =
  | { ok: false; error: string }
  | {
      ok: true;
      session: Awaited<ReturnType<typeof getSession>>;
      restaurantId: string;
      restaurantSlug: string;
    };

async function requireOwner(restaurantSlug: string): Promise<OwnerCheck> {
  const session = await getSession();
  if (!session.user) return { ok: false, error: "Não autenticado" };

  if (session.user.isSuperadmin) {
    const row = await db
      .select({ id: restaurants.id, slug: restaurants.slug })
      .from(restaurants)
      .where(eq(restaurants.slug, restaurantSlug))
      .limit(1);
    if (!row[0]) return { ok: false, error: "Restaurante não encontrado" };
    return { ok: true, session, restaurantId: row[0].id, restaurantSlug };
  }

  const membership = findMembership(session, restaurantSlug);
  if (!membership) return { ok: false, error: "Você não pertence a este restaurante" };
  if (membership.role !== "owner") {
    return { ok: false, error: "Apenas o owner pode gerenciar a equipe" };
  }
  return { ok: true, session, restaurantId: membership.restaurantId, restaurantSlug };
}

export async function inviteTeamMember(input: {
  restaurantSlug: string;
  name: string;
  email: string;
  role: InvitableRole;
}): Promise<TeamActionResult> {
  const auth = await requireOwner(input.restaurantSlug);
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!INVITABLE_ROLES.includes(input.role)) {
    return { ok: false, error: "Tipo de usuário inválido" };
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !name) {
    return { ok: false, error: "Preencha nome e e-mail" };
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      error: "Service role não configurado. Defina SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${baseUrl}/auth/callback`,
    data: {
      signup_type: "invite",
      name,
      restaurant_id: auth.restaurantId,
      role: input.role,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { ok: false, error: "Esse e-mail já tem cadastro" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/admin/${auth.restaurantSlug}/team`);
  return { ok: true };
}

export async function removeTeamMember(input: {
  restaurantSlug: string;
  userId: string;
}): Promise<TeamActionResult> {
  const auth = await requireOwner(input.restaurantSlug);
  if (!auth.ok) return { ok: false, error: auth.error };

  if (input.userId === auth.session?.user?.id) {
    return { ok: false, error: "Você não pode remover você mesmo" };
  }

  // Garante que o user tem membership nesse restaurante
  const membership = await db
    .select()
    .from(userRestaurants)
    .where(
      and(
        eq(userRestaurants.userId, input.userId),
        eq(userRestaurants.restaurantId, auth.restaurantId),
      ),
    )
    .limit(1);

  if (!membership[0]) {
    return { ok: false, error: "Usuário não encontrado nesta pizzaria" };
  }

  // Remove a membership desta pizzaria
  await db
    .delete(userRestaurants)
    .where(
      and(
        eq(userRestaurants.userId, input.userId),
        eq(userRestaurants.restaurantId, auth.restaurantId),
      ),
    );

  // Se o usuário não tem mais nenhuma membership e não é superadmin, remove a conta toda
  const remaining = await db
    .select({ count: userRestaurants.userId })
    .from(userRestaurants)
    .where(eq(userRestaurants.userId, input.userId));

  if (remaining.length === 0) {
    const userRow = await db
      .select({ isSuperadmin: users.isSuperadmin })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    if (userRow[0] && !userRow[0].isSuperadmin) {
      const admin = createSupabaseAdmin();
      if (admin) {
        const { error: deleteAuthError } = await admin.auth.admin.deleteUser(input.userId);
        if (deleteAuthError && !deleteAuthError.message.toLowerCase().includes("not found")) {
          return { ok: false, error: deleteAuthError.message };
        }
      }
      await db.delete(users).where(eq(users.id, input.userId));
    }
  }

  revalidatePath(`/admin/${auth.restaurantSlug}/team`);
  return { ok: true };
}
