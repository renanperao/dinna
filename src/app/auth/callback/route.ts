import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getSession, redirectPathForUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  if (code) {
    const supabase = await createSupabaseServer();
    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  }

  // Se veio um `next` explícito, respeita. Caso contrário, decide pelo role.
  let target: string;
  if (next) {
    target = next;
  } else {
    const session = await getSession();
    target = redirectPathForUser(session);
  }

  const redirectUrl = new URL(target, url.origin);
  return NextResponse.redirect(redirectUrl);
}
