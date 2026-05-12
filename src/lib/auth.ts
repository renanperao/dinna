import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, restaurants } from "@/lib/db/schema";
import { createSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

export type AppRole = "owner" | "operator" | "kitchen" | "delivery" | "superadmin";

export interface AuthSession {
  configured: boolean;
  /** Bypass mode (dev): returns null user but allows access. */
  bypass: boolean;
  user: {
    id: string;
    email: string | null;
    role: AppRole | null;
    restaurantId: string | null;
    restaurantSlug: string | null;
    name: string | null;
  } | null;
}

const isDev = process.env.NODE_ENV !== "production";
const bypassEnv = process.env.AUTH_BYPASS === "true";

/**
 * Returns the current auth session. In dev mode without Supabase configured,
 * returns a bypass session so existing flows keep working.
 */
export async function getSession(): Promise<AuthSession> {
  const configured = isSupabaseConfigured();

  if (!configured) {
    return { configured: false, bypass: isDev || bypassEnv, user: null };
  }

  const supabase = await createSupabaseServer();
  if (!supabase) return { configured: false, bypass: isDev || bypassEnv, user: null };

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return { configured: true, bypass: false, user: null };

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      restaurantId: users.restaurantId,
      restaurantSlug: restaurants.slug,
      name: users.name,
    })
    .from(users)
    .leftJoin(restaurants, eq(users.restaurantId, restaurants.id))
    .where(eq(users.id, authUser.id))
    .limit(1);

  const dbUser = rows[0];

  return {
    configured: true,
    bypass: false,
    user: dbUser
      ? {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role as AppRole,
          restaurantId: dbUser.restaurantId,
          restaurantSlug: dbUser.restaurantSlug,
          name: dbUser.name,
        }
      : {
          id: authUser.id,
          email: authUser.email ?? null,
          role: null,
          restaurantId: null,
          restaurantSlug: null,
          name: authUser.user_metadata?.name ?? authUser.email ?? null,
        },
  };
}

/**
 * Caminho pra onde o usuário deve ir após login, baseado no role dele.
 * Roles sem destino definido caem em /admin/{slug} (o layout vai bloquear
 * com NoAccessScreen, mas o usuário tem oferta de "Sair" pra recomeçar).
 */
export function redirectPathForUser(session: AuthSession): string {
  const u = session.user;
  if (!u) return "/login";

  if (u.role === "superadmin") return "/admin";
  if (!u.restaurantSlug) return "/login";

  switch (u.role) {
    case "owner":
      return `/admin/${u.restaurantSlug}`;
    case "kitchen":
      return `/kitchen/${u.restaurantSlug}`;
    default:
      return `/admin/${u.restaurantSlug}`;
  }
}
