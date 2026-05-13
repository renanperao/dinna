import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/queries/menu";
import { getTeamMembers } from "@/lib/queries/team";
import { getSession } from "@/lib/auth";
import { InviteForm } from "@/components/admin/invite-form";
import { TeamList } from "@/components/admin/team-list";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata = { title: "Equipe · Admin" };

export default async function TeamPage({ params }: PageProps) {
  const { slug } = await params;
  const [restaurant, session] = await Promise.all([
    getRestaurantBySlug(slug),
    getSession(),
  ]);
  if (!restaurant) notFound();

  const members = await getTeamMembers(restaurant.id);
  const currentUserId = session.user?.id ?? null;
  const authConfigured = session.configured;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-5 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">Equipe</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Convide funcionários e gerencie quem tem acesso ao sistema.
        </p>
      </header>

      {!authConfigured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <p className="font-bold">Auth não configurado</p>
          <p className="mt-1 text-xs">
            Configure o Supabase no <code className="rounded bg-white px-1">.env.local</code>{" "}
            (incluindo <code className="rounded bg-white px-1">SUPABASE_SERVICE_ROLE_KEY</code>) pra
            habilitar convites.
          </p>
        </div>
      ) : (
        <InviteForm restaurantSlug={slug} />
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">
          Membros ({members.length})
        </h2>
        <TeamList members={members} currentUserId={currentUserId} restaurantSlug={slug} />
      </section>
    </div>
  );
}
