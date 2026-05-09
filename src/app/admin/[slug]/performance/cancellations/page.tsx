import { notFound } from "next/navigation";
import { XCircle, AlertTriangle, TrendingDown } from "lucide-react";
import { getRestaurantIdBySlug, getAdminStats } from "@/lib/queries/orders";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ slug: string }> }

export default async function CancellationsPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const { recentOrders } = await getAdminStats(restaurantId);
  const cancelled = recentOrders.filter(o => o.status === "cancelled");
  const total = recentOrders.length;
  const rate = total > 0 ? ((cancelled.length / total) * 100).toFixed(1) : "0.0";
  const lostRevenue = cancelled.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Cancelamentos</h1>
        <p className="text-sm text-neutral-500">Análise de pedidos cancelados</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Pedidos cancelados", value: cancelled.length.toString(), icon: XCircle, color: "bg-red-100 text-red-600" },
          { label: "Taxa de cancelamento", value: `${rate}%`, icon: TrendingDown, color: "bg-amber-100 text-amber-600" },
          { label: "Receita perdida", value: formatBRL(lostRevenue), icon: AlertTriangle, color: "bg-orange-100 text-orange-600" },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{card.label}</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-neutral-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="font-bold text-neutral-900">Pedidos cancelados</h2>
        </div>
        {cancelled.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-neutral-400">
            <XCircle className="h-12 w-12 opacity-20" />
            <p className="text-sm font-semibold">Nenhum cancelamento no período 🎉</p>
            <p className="text-xs">Ótimo sinal! Mantenha a qualidade do serviço.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {cancelled.map(o => (
              <div key={o.id} className="flex items-center gap-4 px-5 py-4">
                <XCircle className="h-5 w-5 shrink-0 text-red-400" />
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900">#{o.number} — {o.customerName}</p>
                  <p className="text-xs text-neutral-400">{new Date(o.createdAt).toLocaleString("pt-BR")}</p>
                </div>
                <span className="font-bold text-neutral-700">{formatBRL(Number(o.total))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
