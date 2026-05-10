"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const supabase = await createSupabaseServer();
  if (!supabase) {
    return {
      ok: false,
      error: "Auth não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return { ok: false, error: translateAuthError(error.message) };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function signInWithMagicLink(email: string): Promise<AuthActionResult> {
  const supabase = await createSupabaseServer();
  if (!supabase) {
    return {
      ok: false,
      error: "Auth não configurado.",
    };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback`,
    },
  });

  if (error) {
    return { ok: false, error: translateAuthError(error.message) };
  }

  return { ok: true };
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  if (supabase) {
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar";
  if (m.includes("rate limit")) return "Muitas tentativas. Tente novamente em alguns minutos";
  return msg;
}
