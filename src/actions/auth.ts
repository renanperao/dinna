"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getSession, redirectPathForUser } from "@/lib/auth";

export type AuthActionResult =
  | { ok: true; redirectTo?: string }
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

  // Determina destino baseado no role do usuário
  const session = await getSession();
  return { ok: true, redirectTo: redirectPathForUser(session) };
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

export type SignUpOwnerResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; error: string };

export async function signUpOwner(input: {
  name: string;
  email: string;
  password: string;
  restaurantName: string;
  restaurantPhone: string;
}): Promise<SignUpOwnerResult> {
  const supabase = await createSupabaseServer();
  if (!supabase) {
    return {
      ok: false,
      error: "Auth não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const restaurantName = input.restaurantName.trim();
  const restaurantPhone = input.restaurantPhone.trim();

  if (!name || !restaurantName) {
    return { ok: false, error: "Preencha nome e nome do restaurante" };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "A senha precisa ter no mínimo 8 caracteres" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback`,
      data: {
        signup_type: "owner",
        name,
        restaurant_name: restaurantName,
        restaurant_phone: restaurantPhone,
      },
    },
  });

  if (error) {
    return { ok: false, error: translateAuthError(error.message) };
  }

  const needsEmailConfirmation = !data.session;
  return { ok: true, needsEmailConfirmation };
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
