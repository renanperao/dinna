import { notFound } from "next/navigation";
import { Ticket, PlusCircle, Percent, Calendar, Users } from "lucide-react";
import { getRestaurantIdBySlug } from "@/lib/queries/orders";

interface PageProps { params: Promise<{ slug: string }> }

// Mock coupons for prototype
const MOCK_COUPONS = [
  { code: "BEMVINDO10", type: "percent", value: 10, minOrder: 50, uses: 23, limit: 100, active: true, expiry: "31/05/2026" },
  { code: "FRETEGRATIS", type: "delivery", value: 0, minOrder: 80, uses: 41, limit: null, active: true, expiry: "15/06/2026" },
  { code: "PIZZA20", type: "percent", value: 20, minOrder: 100, uses: 100, limit: 100, active: false, expiry: "30/04/2026" },
];

export default async function CouponsPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Cupons e descontos</h1>
          <p className="text-sm text-neutral-500">Gerencie promoções e descontos</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700">
          <PlusCircle className="h-3.5 w-3.5" /> Criar cupom
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Ativos", value: MOCK_COUPONS.filter(c => c.active).length, icon: Ticket, color: "bg-violet-100 text-violet-600" },
          { label: "Total de usos", value: MOCK_COUPONS.reduce((s, c) => s + c.uses, 0), icon: Users, color: "bg-blue-100 text-blue-600" },
          { label: "Expirados", value: MOCK_COUPONS.filter(c => !c.active).length, icon: Calendar, color: "bg-neutral-100 text-neutral-500" },
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

      {/* Coupon cards */}
      <div className="space-y-4">
        {MOCK_COUPONS.map(coupon => (
          <div key={coupon.code} className={`rounded-2xl border-2 bg-white p-5 shadow-sm transition-colors ${coupon.active ? "border-violet-100" : "border-neutral-100 opacity-60"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                {/* Code badge */}
                <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 px-4 py-2">
                  <span className="font-mono text-lg font-black tracking-widest text-violet-700">{coupon.code}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-neutral-900">
                      {coupon.type === "percent" ? (
                        <span className="flex items-center gap-1"><Percent className="h-4 w-4 text-violet-500" /> {coupon.value}% de desconto</span>
                      ) : (
                        <span className="flex items-center gap-1"><Ticket className="h-4 w-4 text-emerald-500" /> Frete grátis</span>
                      )}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${coupon.active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                      {coupon.active ? "Ativo" : "Expirado"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Pedido mínimo: R$ {coupon.minOrder.toFixed(2).replace(".", ",")} · Válido até {coupon.expiry}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-bold text-neutral-900">{coupon.uses}</p>
                  <p className="text-xs text-neutral-400">{coupon.limit ? `de ${coupon.limit} usos` : "usos (sem limite)"}</p>
                  {coupon.limit && (
                    <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min((coupon.uses / coupon.limit) * 100, 100)}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50">Editar</button>
                  {coupon.active && (
                    <button className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Desativar</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
