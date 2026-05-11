import { redirect } from "next/navigation";
import { getSession, redirectPathForUser } from "@/lib/auth";

// /admin sem slug: encaminha pro slug do usuário logado.
// Em bypass mode (dev sem Supabase) não há user — manda pro restaurante demo.
export default async function AdminIndex() {
  const session = await getSession();

  if (session.bypass) {
    const fallback = process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG ?? "restaurante-demo";
    redirect(`/admin/${fallback}`);
  }

  if (!session.user) {
    redirect("/login?next=/admin");
  }

  redirect(redirectPathForUser(session));
}
