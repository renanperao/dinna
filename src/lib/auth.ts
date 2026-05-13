import "server-only";

import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, userRestaurants, restaurants } from "@/lib/db/schema";
import { createSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

export type MembershipRole = "owner" | "operator" | "kitchen" | "delivery";

export interface Membership {
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  role: MembershipRole;
}

export interface AuthSession {
  configured: boolean;
  /** Bypass mode (dev): returns null user but allows access. */
  bypass: boolean;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    isSuperadmin: boolean;
    memberships: Membership[];
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

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isSuperadmin: users.isSuperadmin,
    })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  const dbUser = userRows[0];

  if (!dbUser) {
    // Usuário existe em auth.users mas não em public.users (caso de criação manual no Studio).
    return {
      configured: true,
      bypass: false,
      user: {
        id: authUser.id,
        email: authUser.email ?? null,
        name: authUser.user_metadata?.name ?? authUser.email ?? null,
        isSuperadmin: false,
        memberships: [],
      },
    };
  }

  const membershipRows = await db
    .select({
      restaurantId: userRestaurants.restaurantId,
      restaurantSlug: restaurants.slug,
      restaurantName: restaurants.name,
      role: userRestaurants.role,
    })
    .from(userRestaurants)
    .innerJoin(restaurants, eq(userRestaurants.restaurantId, restaurants.id))
    .where(eq(userRestaurants.userId, authUser.id))
    .orderBy(asc(restaurants.name));

  return {
    configured: true,
    bypass: false,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      isSuperadmin: dbUser.isSuperadmin ?? false,
      memberships: membershipRows.map((m) => ({
        restaurantId: m.restaurantId,
        restaurantSlug: m.restaurantSlug,
        restaurantName: m.restaurantName,
        role: m.role as MembershipRole,
      })),
    },
  };
}

/**
 * Caminho pra onde o usuário deve ir após login.
 * - Superadmin → /admin (lista de todos os clientes)
 * - 1+ membership → /admin/{primeiro slug em ordem alfabética}
 * - 0 memberships → /login
 */
export function redirectPathForUser(session: AuthSession): string {
  const u = session.user;
  if (!u) return "/login";

  if (u.isSuperadmin) return "/admin";

  const first = u.memberships[0];
  if (!first) return "/login";

  if (first.role === "kitchen") return `/kitchen/${first.restaurantSlug}`;
  return `/admin/${first.restaurantSlug}`;
}

/**
 * Retorna a membership do usuário para um slug específico, ou null.
 * Superadmin retorna uma membership sintética com role "owner" para
 * conveniência do código de autorização (acessa tudo como se fosse owner).
 */
export function findMembership(
  session: AuthSession,
  slug: string,
): Membership | null {
  const u = session.user;
  if (!u) return null;
  const direct = u.memberships.find((m) => m.restaurantSlug === slug);
  if (direct) return direct;
  if (u.isSuperadmin) {
    return {
      restaurantId: "",
      restaurantSlug: slug,
      restaurantName: "",
      role: "owner",
    };
  }
  return null;
}
