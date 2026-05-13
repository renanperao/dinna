import { notFound, redirect } from "next/navigation";
import { ChefHat } from "lucide-react";
import { getRestaurantIdBySlug, getOrdersForKDS } from "@/lib/queries/orders";
import { getRestaurantBySlug } from "@/lib/queries/menu";
import { KDSBoard } from "@/components/kitchen/kds-board";
import { findMembership, getSession } from "@/lib/auth";
import { NoAccessScreen } from "@/components/auth/no-access-screen";
import { KitchenSignOutButton } from "@/components/kitchen/sign-out-button";

// KDS pulls live state on every request; client-side Realtime + polling
// trigger router.refresh() to re-run this query.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  return { title: `KDS · ${restaurant?.name ?? "Cozinha"}` };
}

export default async function KitchenPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getSession();

  // Auth: owner/kitchen (com membership nesse slug) ou superadmin acessam. Bypass (dev) libera.
  if (!session.bypass) {
    if (!session.user) {
      redirect(`/login?next=/kitchen/${slug}`);
    }
    const isSuperadmin = session.user.isSuperadmin;
    const membership = findMembership(session, slug);
    const fallback = session.user.memberships[0]?.restaurantSlug ?? null;

    if (!isSuperadmin && !membership) {
      return <NoAccessScreen reason="wrong-restaurant" yourSlug={fallback} />;
    }
    if (!isSuperadmin && membership && membership.role !== "owner" && membership.role !== "kitchen") {
      return <NoAccessScreen reason="wrong-role" role={membership.role} yourSlug={fallback} />;
    }
  }

  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const restaurant = await getRestaurantBySlug(slug);
  const orders = await getOrdersForKDS(restaurantId);

  const active = orders.filter((o) =>
    ["received", "preparing"].includes(o.status),
  ).length;

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-neutral-900">
              Cozinha · {restaurant?.name}
            </h1>
            <p className="text-xs text-neutral-500">
              {active > 0 ? (
                <span className="font-semibold text-amber-600">
                  {active} pedido{active > 1 ? "s" : ""} em preparo
                </span>
              ) : (
                "Nenhum pedido ativo"
              )}
            </p>
          </div>
        </div>
        {session.configured && session.user && <KitchenSignOutButton />}
      </header>

      <main className="px-4 py-6 pb-24 sm:px-6">
        <KDSBoard orders={orders} slug={slug} restaurantId={restaurantId} />
      </main>
    </div>
  );
}
