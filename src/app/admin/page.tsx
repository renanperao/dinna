import Link from "next/link";
import { redirect } from "next/navigation";
import { UtensilsCrossed, ChevronRight } from "lucide-react";
import { getSession, redirectPathForUser } from "@/lib/auth";
import { getAllRestaurants } from "@/lib/queries/restaurants";
import { signOut } from "@/actions/auth";

// /admin sem slug: superadmin vê todos os clientes; outros usuários
// são redirecionados para o painel do próprio restaurante.
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

  if (session.user.role !== "superadmin") {
    redirect(redirectPathForUser(session));
  }

  const restaurants = await getAllRestaurants();

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-sm">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900">NexoMenu · Superadmin</p>
              <p className="text-xs text-neutral-500">{session.user.email}</p>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Todos os clientes</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {restaurants.length} {restaurants.length === 1 ? "restaurante" : "restaurantes"} cadastrado{restaurants.length === 1 ? "" : "s"}.
          </p>
        </div>

        {restaurants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <p className="text-sm text-neutral-500">Nenhum restaurante cadastrado ainda.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {restaurants.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/${r.slug}`}
                  className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-4 py-4 transition hover:border-violet-200 hover:shadow-sm"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm"
                    style={{ background: r.primaryColor ?? "#7c3aed" }}
                  >
                    {r.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-neutral-900">{r.name}</p>
                      {!r.isActive && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                          inativo
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-neutral-500">/{r.slug}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 group-hover:text-violet-500" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
