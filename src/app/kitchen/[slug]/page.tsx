import { notFound } from "next/navigation";
import { ChefHat, RefreshCw } from "lucide-react";
import { getRestaurantIdBySlug, getOrdersForKDS } from "@/lib/queries/orders";
import { getRestaurantBySlug } from "@/lib/queries/menu";
import { KDSBoard } from "@/components/kitchen/kds-board";
import { DemoNav } from "@/components/demo-nav";

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
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <RefreshCw className="h-3 w-3 animate-spin [animation-duration:10s]" />
          Atualiza a cada 10s
        </div>
      </header>

      <main className="px-4 py-6 pb-24 sm:px-6">
        <KDSBoard orders={orders} slug={slug} />
      </main>

      <DemoNav slug={slug} />
    </div>
  );
}
