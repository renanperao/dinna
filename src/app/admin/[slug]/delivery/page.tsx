import { notFound } from "next/navigation";
import { Bike, MapPin, Clock, Plus, Pencil, Trash2, CheckCircle } from "lucide-react";
import { getRestaurantBySlug } from "@/lib/queries/menu";
import { formatBRL } from "@/lib/utils";

interface PageProps { params: Promise<{ slug: string }> }

interface DeliveryZone { neighborhood: string; fee: number; maxMinutes: number }

export default async function DeliveryPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const zones = (restaurant.deliveryZones as DeliveryZone[] | null) ?? [];

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Delivery</h1>
          <p className="text-sm text-neutral-500">Zonas de entrega e configurações</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700">
          <Plus className="h-3.5 w-3.5" /> Nova zona
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Zonas cadastradas", value: zones.length.toString(), icon: MapPin, color: "bg-blue-100 text-blue-600" },
          { label: "Taxa mínima", value: zones.length ? formatBRL(Math.min(...zones.map(z => z.fee))) : "—", icon: Bike, color: "bg-emerald-100 text-emerald-600" },
          { label: "Prazo máximo", value: zones.length ? `${Math.max(...zones.map(z => z.maxMinutes))} min` : "—", icon: Clock, color: "bg-amber-100 text-amber-600" },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{card.label}</p>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="text-2xl font-black text-neutral-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Zones table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="font-bold text-neutral-900">Zonas de entrega</h2>
        </div>
        {zones.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-neutral-400">
            <Bike className="h-12 w-12 opacity-20" />
            <p className="text-sm">Nenhuma zona cadastrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-5 py-3">Bairro / Região</th>
                  <th className="px-5 py-3 text-right">Taxa de entrega</th>
                  <th className="px-5 py-3 text-right">Tempo estimado</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {zones.map((zone, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-neutral-900">{zone.neighborhood}</td>
                    <td className="px-5 py-4 text-right font-semibold text-neutral-900">{formatBRL(zone.fee)}</td>
                    <td className="px-5 py-4 text-right text-neutral-600">até {zone.maxMinutes} min</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle className="h-3 w-3" /> Ativa
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button className="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-50" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                        <button className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50" title="Remover"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delivery settings */}
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-neutral-900">Configurações de entrega</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "Pedido mínimo para delivery", value: restaurant.minOrderValue ? formatBRL(Number(restaurant.minOrderValue)) : "Sem mínimo" },
            { label: "Raio máximo de entrega", value: "Configurado por bairros" },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-neutral-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{item.label}</p>
              <p className="mt-1 font-bold text-neutral-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
