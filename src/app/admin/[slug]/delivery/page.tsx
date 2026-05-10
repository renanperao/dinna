import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/queries/menu";
import { formatBRL } from "@/lib/utils";
import {
  DeliveryZonesClient,
} from "@/components/admin/delivery-zones-client";
import type { DeliveryZone } from "@/actions/delivery-zones";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DeliveryPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const zones = (restaurant.deliveryZones as DeliveryZone[] | null) ?? [];

  return (
    <div className="px-5 py-6 sm:px-8">
      <DeliveryZonesClient slug={slug} zones={zones} />

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-neutral-900">Configurações de entrega</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              label: "Pedido mínimo para delivery",
              value: restaurant.minOrderValue
                ? formatBRL(Number(restaurant.minOrderValue))
                : "Sem mínimo",
            },
            { label: "Raio máximo de entrega", value: "Configurado por bairros" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-neutral-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {item.label}
              </p>
              <p className="mt-1 font-bold text-neutral-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
