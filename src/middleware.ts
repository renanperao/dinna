import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/admin", "/kitchen"];
const AUTH_PATHS = ["/login", "/auth/callback"];

const isDev = process.env.NODE_ENV !== "production";
const bypassEnv = process.env.AUTH_BYPASS === "true";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));

  // Always refresh session so cookies stay valid (when configured)
  const { response, user, configured } = await updateSession(req);

  // Dev bypass: skip all auth checks when Supabase isn't configured
  if (!configured && (isDev || bypassEnv)) {
    return response;
  }

  if (isProtected && !user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && user && pathname === "/login") {
    const next = req.nextUrl.searchParams.get("next") ?? "/admin";
    const url = req.nextUrl.clone();
    url.pathname = next.startsWith("/") ? next : "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static files, api routes are handled per-route
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
