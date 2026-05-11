"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

export type TeamActionResult =
  | { ok: true }
  | { ok: false; error: string };

const INVITABLE_ROLES = ["operator", "kitchen", "delivery"] as const;
type InvitableRole = (typeof INVITABLE_ROLES)[number];

export async function inviteTeamMember(input: {
  name: string;
  email: string;
  role: InvitableRole;
}): Promise<TeamActionResult> {
  const session = await getSession();
  if (!session.user || session.user.role !== "owner") {
    return { ok: false, error: "Apenas o owner pode convidar funcionários" };
  }
  if (!session.user.restaurantId || !session.user.restaurantSlug) {
    return { ok: false, error: "Restaurante não encontrado" };
  }

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
      restaurant_id: session.user.restaurantId,
      role: input.role,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { ok: false, error: "Esse e-mail já tem cadastro" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/admin/${session.user.restaurantSlug}/team`);
  return { ok: true };
}

export async function removeTeamMember(userId: string): Promise<TeamActionResult> {
  const session = await getSession();
  if (!session.user || session.user.role !== "owner") {
    return { ok: false, error: "Apenas o owner pode remover funcionários" };
  }
  if (userId === session.user.id) {
    return { ok: false, error: "Você não pode remover você mesmo" };
  }

  // Garante que o user pertence ao restaurante do owner antes de remover
  const target = await db
    .select({ id: users.id, restaurantId: users.restaurantId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target[0] || target[0].restaurantId !== session.user.restaurantId) {
    return { ok: false, error: "Usuário não encontrado" };
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: "Service role não configurado" };
  }

  // Remove do auth → cascade pra public.users via FK seria ideal, mas users.id é PK
  // sem FK pra auth.users. Então removemos das duas tabelas explicitamente.
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
  if (deleteAuthError && !deleteAuthError.message.toLowerCase().includes("not found")) {
    return { ok: false, error: deleteAuthError.message };
  }

  await db.delete(users).where(eq(users.id, userId));

  revalidatePath(`/admin/${session.user.restaurantSlug}/team`);
  return { ok: true };
}
