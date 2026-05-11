import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getSession, redirectPathForUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;
  let isInvite = false;

  if (code) {
    const supabase = await createSupabaseServer();
    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      isInvite = user?.user_metadata?.signup_type === "invite";
    }
  }

  // Se veio um `next` explícito, respeita. Caso contrário, decide pelo role.
  let target: string;
  if (safeNext) {
    target = safeNext;
  } else if (isInvite) {
    const session = await getSession();
    const redirectAfterPassword = redirectPathForUser(session);
    target = `/auth/set-password?next=${encodeURIComponent(redirectAfterPassword)}`;
  } else {
    const session = await getSession();
    target = redirectPathForUser(session);
  }

  const redirectUrl = new URL(target, url.origin);
  return NextResponse.redirect(redirectUrl);
}
