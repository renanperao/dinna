import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

export type AppRole = "owner" | "manager" | "operator" | "kitchen" | "delivery";

export interface AuthSession {
  configured: boolean;
  /** Bypass mode (dev): returns null user but allows access. */
  bypass: boolean;
  user: {
    id: string;
    email: string | null;
    role: AppRole | null;
    restaurantId: string | null;
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

  // Look up our app users row by id
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      restaurantId: users.restaurantId,
      name: users.name,
    })
    .from(users)
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
          name: dbUser.name,
        }
      : {
          id: authUser.id,
          email: authUser.email ?? null,
          role: null,
          restaurantId: null,
          name: authUser.user_metadata?.name ?? authUser.email ?? null,
        },
  };
}

/**
 * Throws (or returns) information that the calling page should redirect.
 * Use in admin/kitchen pages to enforce auth + role.
 */
export async function requireSession(opts?: {
  allowedRoles?: AppRole[];
}): Promise<AuthSession> {
  const session = await getSession();

  // Dev / unconfigured: bypass
  if (session.bypass) return session;

  // Configured but not logged in
  if (!session.user) return session;

  // Role check (if specified)
  if (opts?.allowedRoles && session.user.role && !opts.allowedRoles.includes(session.user.role)) {
    return { ...session, user: null }; // signal "forbidden"
  }

  return session;
}
