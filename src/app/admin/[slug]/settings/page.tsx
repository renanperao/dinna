import { notFound } from "next/navigation";
import { Store, Phone, MapPin, Clock, Save, Palette, Globe } from "lucide-react";
import { getRestaurantBySlug } from "@/lib/queries/menu";
import { formatPhone } from "@/lib/utils";

interface PageProps { params: Promise<{ slug: string }> }

const DAY_LABELS: Record<string, string> = {
  mon: "Segunda", tue: "Terça", wed: "Quarta",
  thu: "Quinta", fri: "Sexta", sat: "Sábado", sun: "Domingo",
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default async function SettingsPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const address = restaurant.address as { street: string; number: string; neighborhood: string; city: string; state: string } | null;
  const hours = restaurant.businessHours as Record<string, { open: string; close: string; closed?: boolean }> | null;

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Minha empresa</h1>
        <p className="text-sm text-neutral-500">Configurações do seu restaurante</p>
      </div>

      <div className="space-y-6">
        {/* Basic info */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Store className="h-4 w-4 text-violet-600" />
            <h2 className="font-bold text-neutral-900">Dados do restaurante</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Nome</label>
              <input defaultValue={restaurant.name} className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Slug (URL)</label>
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm bg-neutral-50 text-neutral-500">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                dinna.app/<strong className="text-neutral-800">{restaurant.slug}</strong>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Telefone</label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-neutral-400" />
                <input defaultValue={formatPhone(restaurant.phone)} className="flex-1 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">WhatsApp</label>
              <input defaultValue={formatPhone(restaurant.whatsapp)} className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Descrição</label>
              <textarea defaultValue={restaurant.description ?? ""} rows={2} className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none resize-none" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-violet-600" />
            <h2 className="font-bold text-neutral-900">Endereço</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Rua</label>
              <input defaultValue={address?.street ?? ""} className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Número</label>
              <input defaultValue={address?.number ?? ""} className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Bairro</label>
              <input defaultValue={address?.neighborhood ?? ""} className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Cidade</label>
              <input defaultValue={address?.city ?? ""} className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Estado</label>
              <input defaultValue={address?.state ?? ""} className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Business hours */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Clock className="h-4 w-4 text-violet-600" />
            <h2 className="font-bold text-neutral-900">Horários de funcionamento</h2>
          </div>
          <div className="space-y-2">
            {DAY_ORDER.map(day => {
              const h = hours?.[day];
              const closed = !h || h.closed;
              return (
                <div key={day} className="flex items-center gap-4 rounded-xl border border-neutral-100 px-4 py-3">
                  <span className="w-24 text-sm font-semibold text-neutral-700">{DAY_LABELS[day]}</span>
                  {closed ? (
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-400">Fechado</span>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <span className="rounded-lg border border-neutral-200 px-3 py-1 font-mono text-xs">{h!.open}</span>
                      <span className="text-neutral-400">até</span>
                      <span className="rounded-lg border border-neutral-200 px-3 py-1 font-mono text-xs">{h!.close}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Brand colors */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Palette className="h-4 w-4 text-violet-600" />
            <h2 className="font-bold text-neutral-900">Identidade visual</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Cor principal</label>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl" style={{ backgroundColor: restaurant.primaryColor ?? "#E63946" }} />
                <input defaultValue={restaurant.primaryColor ?? "#E63946"} className="flex-1 rounded-xl border border-neutral-200 px-3 py-2.5 font-mono text-sm focus:border-violet-400 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Cor secundária</label>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl border border-neutral-200 bg-[#1D3557]" />
                <input defaultValue="#1D3557" className="flex-1 rounded-xl border border-neutral-200 px-3 py-2.5 font-mono text-sm focus:border-violet-400 focus:outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700">
            <Save className="h-4 w-4" /> Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}
