import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role key. Bypassa RLS e tem acesso à API admin
 * (inviteUserByEmail, deleteUser, listUsers, etc).
 *
 * NUNCA importar isso em código que roda no client. A chave dá acesso total ao projeto.
 */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
