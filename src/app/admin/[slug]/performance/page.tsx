import { notFound } from "next/navigation";
import { TrendingUp, ShoppingBag, Users, BarChart2 } from "lucide-react";
import { getRestaurantIdBySlug } from "@/lib/queries/orders";
import {
  getRevenueByDay,
  getSummaryStats,
  getPaymentBreakdown,
  getHeatmap,
  resolvePeriod,
  type PeriodKey,
} from "@/lib/queries/analytics";
import { formatBRL } from "@/lib/utils";
import { RevenueChart } from "@/components/admin/charts/revenue-chart";
import { TrendPill } from "@/components/admin/charts/trend-pill";
import { Heatmap } from "@/components/admin/charts/heatmap";
import { PeriodTabs, type PeriodValue } from "@/components/admin/period-tabs";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string }>;
}

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  credit: "Cartão de Crédito",
  debit: "Cartão de Débito",
  cash: "Dinheiro",
  on_delivery_card: "Cartão/Entrega",
  on_delivery_cash: "Dinheiro/Entrega",
};

const METHOD_COLORS: Record<string, string> = {
  pix: "bg-emerald-500",
  credit: "bg-blue-500",
  debit: "bg-indigo-400",
  cash: "bg-amber-500",
  on_delivery_card: "bg-violet-500",
  on_delivery_cash: "bg-orange-400",
};

function isValidPeriod(value: string | undefined): value is PeriodValue {
  return value === "7d" || value === "30d" || value === "month";
}

export default async function PerformancePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { period: periodParam } = await searchParams;
  const period: PeriodValue = isValidPeriod(periodParam) ? periodParam : "7d";

  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const range = resolvePeriod(period as PeriodKey);

  const [revenueByDay, stats, payments, heatmap] = await Promise.all([
    getRevenueByDay(restaurantId, period as PeriodKey),
    getSummaryStats(restaurantId),
    getPaymentBreakdown(restaurantId, range.days),
    getHeatmap(restaurantId, range.days),
  ]);

  const totalPaymentRevenue = payments.reduce((s, p) => s + p.revenue, 0) || 1;

  const summaryCards = [
    {
      label: "Hoje",
      icon: ShoppingBag,
      iconColor: "text-violet-600",
      value: formatBRL(stats.today.revenue),
      sub: `${stats.today.count} pedido${stats.today.count !== 1 ? "s" : ""}`,
      trend: <TrendPill current={stats.today.revenue} previous={stats.yesterday.revenue} suffix="vs ontem" />,
    },
    {
      label: "Últimos 7 dias",
      icon: TrendingUp,
      iconColor: "text-blue-600",
      value: formatBRL(stats.week.revenue),
      sub: `${stats.week.count} pedido${stats.week.count !== 1 ? "s" : ""}`,
      trend: <TrendPill current={stats.week.revenue} previous={stats.prevWeek.revenue} suffix="vs semana anterior" />,
    },
    {
      label: "Este mês",
      icon: BarChart2,
      iconColor: "text-emerald-600",
      value: formatBRL(stats.month.revenue),
      sub: `${stats.month.count} pedido${stats.month.count !== 1 ? "s" : ""}`,
      trend: <TrendPill current={stats.month.revenue} previous={stats.prevMonth.revenue} suffix="vs mês anterior" />,
    },
    {
      label: "Clientes ativos",
      icon: Users,
      iconColor: "text-amber-600",
      value: stats.totalCustomers.toString(),
      sub: `${stats.newCustomersThisMonth} novo${stats.newCustomersThisMonth !== 1 ? "s" : ""} este mês`,
      trend: (
        <TrendPill
          current={stats.newCustomersThisMonth}
          previous={stats.newCustomersPrevMonth}
          suffix="vs mês anterior"
        />
      ),
    },
  ];

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Desempenho · Vendas</h1>
          <p className="text-sm text-neutral-500">
            {range.label} · análise de faturamento e pedidos
          </p>
        </div>
        <PeriodTabs active={period} />
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {card.label}
                </p>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
              <p className="text-2xl font-black text-neutral-900">{card.value}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{card.sub}</p>
              <div className="mt-2">{card.trend}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-bold text-neutral-900">Faturamento — {range.label.toLowerCase()}</h2>
              <p className="text-xs text-neutral-500">
                Total {formatBRL(revenueByDay.currentTotal.revenue)} · {revenueByDay.currentTotal.count} pedidos
              </p>
            </div>
            <TrendPill
              current={revenueByDay.currentTotal.revenue}
              previous={revenueByDay.previousTotal.revenue}
              suffix="vs período anterior"
            />
          </div>
          <RevenueChart data={revenueByDay.current} />
        </div>

        {/* Payment methods */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-neutral-900">Formas de pagamento</h2>
          {payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">Sem dados no período</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => {
                const pct = Math.round((p.revenue / totalPaymentRevenue) * 100);
                return (
                  <div key={p.method}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-700">
                        {METHOD_LABELS[p.method] ?? p.method}
                      </span>
                      <span className="text-neutral-500">
                        {pct}% · {formatBRL(p.revenue)}
                      </span>
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

      {/* Heatmap */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="font-bold text-neutral-900">Mapa de calor — dia × hora</h2>
          <p className="text-xs text-neutral-500">
            Volume de pedidos por dia da semana e hora · {range.label.toLowerCase()} ·{" "}
            {heatmap.totalOrders} pedido{heatmap.totalOrders !== 1 ? "s" : ""}
          </p>
        </div>
        {heatmap.totalOrders === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">Sem dados no período</p>
        ) : (
          <Heatmap matrix={heatmap.matrix} maxValue={heatmap.maxValue} />
        )}
      </div>
    </div>
  );
}
