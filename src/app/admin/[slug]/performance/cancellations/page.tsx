import { notFound } from "next/navigation";
import { XCircle, AlertTriangle, TrendingDown } from "lucide-react";
import { getRestaurantIdBySlug } from "@/lib/queries/orders";
import { getCancellationStats, resolvePeriod, type PeriodKey } from "@/lib/queries/analytics";
import { formatBRL } from "@/lib/utils";
import { PeriodTabs, type PeriodValue } from "@/components/admin/period-tabs";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string }>;
}

function isValidPeriod(value: string | undefined): value is PeriodValue {
  return value === "7d" || value === "30d" || value === "month";
}

export default async function CancellationsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { period: periodParam } = await searchParams;
  const period: PeriodValue = isValidPeriod(periodParam) ? periodParam : "30d";

  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const range = resolvePeriod(period as PeriodKey);
  const stats = await getCancellationStats(restaurantId, range.days);

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Cancelamentos</h1>
          <p className="text-sm text-neutral-500">
            {range.label} · {stats.totalOrders} pedido{stats.totalOrders !== 1 ? "s" : ""} no período
          </p>
        </div>
        <PeriodTabs active={period} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Pedidos cancelados",
            value: stats.cancelledCount.toString(),
            icon: XCircle,
            color: "bg-red-100 text-red-600",
          },
          {
            label: "Taxa de cancelamento",
            value: `${stats.ratePct.toFixed(1)}%`,
            icon: TrendingDown,
            color: "bg-amber-100 text-amber-600",
          },
          {
            label: "Receita perdida",
            value: formatBRL(stats.lostRevenue),
            icon: AlertTriangle,
            color: "bg-orange-100 text-orange-600",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {card.label}
                </p>
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
        {stats.cancelledOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-neutral-400">
            <XCircle className="h-12 w-12 opacity-20" />
            <p className="text-sm font-semibold">Nenhum cancelamento no período 🎉</p>
            <p className="text-xs">Ótimo sinal! Mantenha a qualidade do serviço.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {stats.cancelledOrders.map((o) => (
              <div key={o.id} className="flex items-start gap-4 px-5 py-4">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900">
                    #{o.number} — {o.customerName}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {new Date(o.cancelledAt ?? o.createdAt).toLocaleString("pt-BR")}
                  </p>
                  {o.cancelledReason ? (
                    <p className="mt-1 text-xs text-neutral-600">
                      <span className="font-semibold text-neutral-700">Motivo:</span> {o.cancelledReason}
                    </p>
                  ) : null}
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
