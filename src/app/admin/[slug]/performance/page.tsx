import { notFound } from "next/navigation";
import { TrendingUp, ShoppingBag, Users, ArrowUpRight, BarChart2 } from "lucide-react";
import { getRestaurantIdBySlug } from "@/lib/queries/orders";
import { getRevenueByDay, getSummaryStats, getPaymentBreakdown } from "@/lib/queries/analytics";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ slug: string }> }

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX", credit: "Cartão de Crédito", debit: "Cartão de Débito",
  cash: "Dinheiro", on_delivery_card: "Cartão/Entrega", on_delivery_cash: "Dinheiro/Entrega",
};
const METHOD_COLORS: Record<string, string> = {
  pix: "bg-emerald-500", credit: "bg-blue-500", debit: "bg-indigo-400",
  cash: "bg-amber-500", on_delivery_card: "bg-violet-500", on_delivery_cash: "bg-orange-400",
};

function RevenueChart({ data }: { data: { label: string; revenue: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((d, idx) => {
        const pct = (d.revenue / max) * 100;
        return (
          <div key={idx} className="group relative flex flex-1 flex-col items-center gap-1">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden rounded-lg bg-neutral-900 px-2 py-1.5 text-center text-xs text-white shadow-lg group-hover:block">
              <p className="font-bold">{formatBRL(d.revenue)}</p>
              <p className="text-neutral-400">{d.count} pedidos</p>
            </div>
            {/* Bar */}
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-violet-400 transition-all"
              style={{ height: `${Math.max(pct, 2)}%` }}
            />
            <p className="text-center text-[10px] text-neutral-500">{d.label}</p>
          </div>
        );
      })}
    </div>
  );
}

export default async function PerformancePage({ params }: PageProps) {
  const { slug } = await params;
  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const [daily7, daily30, stats, payments] = await Promise.all([
    getRevenueByDay(restaurantId, 7),
    getRevenueByDay(restaurantId, 30),
    getSummaryStats(restaurantId),
    getPaymentBreakdown(restaurantId, 30),
  ]);

  const totalPaymentRevenue = payments.reduce((s, p) => s + p.revenue, 0) || 1;

  const summaryCards = [
    { label: "Hoje", count: stats.today.count, revenue: stats.today.revenue, icon: ShoppingBag, color: "text-violet-600" },
    { label: "Últimos 7 dias", count: stats.week.count, revenue: stats.week.revenue, icon: TrendingUp, color: "text-blue-600" },
    { label: "Este mês", count: stats.month.count, revenue: stats.month.revenue, icon: BarChart2, color: "text-emerald-600" },
    { label: "Total de clientes", count: stats.totalCustomers, revenue: null, icon: Users, color: "text-amber-600" },
  ];

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Desempenho · Vendas</h1>
          <p className="text-sm text-neutral-500">Análise de faturamento e pedidos</p>
        </div>
        <div className="flex gap-2">
          {["7 dias", "30 dias", "Este mês"].map((l, i) => (
            <button key={l} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${i === 0 ? "bg-violet-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{card.label}</p>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              {card.revenue !== null ? (
                <>
                  <p className="text-2xl font-black text-neutral-900">{formatBRL(card.revenue)}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                    <ArrowUpRight className="h-3 w-3" />
                    {card.count} pedido{card.count !== 1 ? "s" : ""}
                  </p>
                </>
              ) : (
                <p className="text-2xl font-black text-neutral-900">{card.count}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-neutral-900">Faturamento — últimos 7 dias</h2>
            <span className="text-sm font-semibold text-violet-600">
              {formatBRL(daily7.reduce((s, d) => s + d.revenue, 0))} total
            </span>
          </div>
          <RevenueChart data={daily7} />
        </div>

        {/* Payment methods */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-neutral-900">Formas de pagamento</h2>
          {payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">Sem dados</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => {
                const pct = Math.round((p.revenue / totalPaymentRevenue) * 100);
                return (
                  <div key={p.method}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-700">{METHOD_LABELS[p.method] ?? p.method}</span>
                      <span className="text-neutral-500">{pct}% · {formatBRL(p.revenue)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={`h-full rounded-full ${METHOD_COLORS[p.method] ?? "bg-neutral-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 30-day chart */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-neutral-900">Faturamento — últimos 30 dias</h2>
          <span className="text-sm font-semibold text-violet-600">
            {formatBRL(daily30.reduce((s, d) => s + d.revenue, 0))} total
          </span>
        </div>
        <RevenueChart data={daily30} />
      </div>
    </div>
  );
}
