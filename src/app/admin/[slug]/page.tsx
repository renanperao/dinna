import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ShoppingBag,
  TrendingUp,
  Clock,
  Ticket,
  MapPin,
  Store,
  ChefHat,
} from "lucide-react";
import { getRestaurantIdBySlug, getAdminStats } from "@/lib/queries/orders";
import { getOrdersByHourToday, getSummaryStats } from "@/lib/queries/analytics";
import { formatBRL } from "@/lib/utils";
import { HourlyChart } from "@/components/admin/charts/hourly-chart";
import { TrendPill } from "@/components/admin/charts/trend-pill";

export const revalidate = 30;

interface PageProps {
  params: Promise<{ slug: string }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: "Aguardando pagamento", color: "bg-neutral-100 text-neutral-700" },
  received: { label: "Recebido", color: "bg-amber-100 text-amber-800" },
  preparing: { label: "Preparando", color: "bg-blue-100 text-blue-800" },
  ready: { label: "Pronto", color: "bg-green-100 text-green-800" },
  out_for_delivery: { label: "Em entrega", color: "bg-indigo-100 text-indigo-800" },
  delivered: { label: "Entregue", color: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
  on_delivery_card: "Cartão/Entrega",
  on_delivery_cash: "Dinheiro/Entrega",
};

function timeAgo(date: Date | string): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return new Date(date).toLocaleDateString("pt-BR");
}

export default async function AdminDashboard({ params }: PageProps) {
  const { slug } = await params;
  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const [stats, summary, hourly] = await Promise.all([
    getAdminStats(restaurantId),
    getSummaryStats(restaurantId),
    getOrdersByHourToday(restaurantId),
  ]);

  const yesterdayAvgTicket =
    summary.yesterday.count > 0 ? summary.yesterday.revenue / summary.yesterday.count : 0;
  const peakHour = hourly.reduce((acc, h) => (h.count > acc.count ? h : acc), { hour: 0, count: 0 });

  const statCards = [
    {
      label: "Pedidos hoje",
      value: stats.todayCount.toString(),
      icon: ShoppingBag,
      color: "bg-violet-600",
      trend: <TrendPill current={summary.today.count} previous={summary.yesterday.count} suffix="vs ontem" />,
    },
    {
      label: "Receita hoje",
      value: formatBRL(stats.todayRevenue),
      icon: TrendingUp,
      color: "bg-emerald-600",
      trend: <TrendPill current={summary.today.revenue} previous={summary.yesterday.revenue} suffix="vs ontem" />,
    },
    {
      label: "Em aberto",
      value: stats.pendingCount.toString(),
      icon: Clock,
      color: "bg-amber-500",
      trend: (
        <span className="text-xs text-neutral-500">recebidos + preparando</span>
      ),
    },
    {
      label: "Ticket médio",
      value: formatBRL(stats.avgTicket),
      icon: Ticket,
      color: "bg-blue-600",
      trend: <TrendPill current={stats.avgTicket} previous={yesterdayAvgTicket} suffix="vs ontem" />,
    },
  ];

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-500">{card.label}</p>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.color} text-white`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-neutral-900">{card.value}</p>
              <div className="mt-2">{card.trend}</div>
            </div>
          );
        })}
      </div>

      {/* Hourly chart + KDS card */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-bold text-neutral-900">Pedidos por hora — hoje</h2>
              <p className="text-xs text-neutral-500">
                {peakHour.count > 0
                  ? `Pico às ${String(peakHour.hour).padStart(2, "0")}:00 com ${peakHour.count} pedido${peakHour.count !== 1 ? "s" : ""}`
                  : "Sem pedidos ainda hoje"}
              </p>
            </div>
            <span className="text-sm font-semibold text-violet-600">
              {summary.today.count} hoje
            </span>
          </div>
          <HourlyChart data={hourly} />
        </div>

        <Link
          href={`/kitchen/${slug}`}
          className="group flex flex-col justify-between rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50 p-5 transition-colors hover:border-violet-400 hover:bg-violet-100"
        >
          <div>
            <ChefHat className="mb-2 h-7 w-7 text-violet-500" />
            <p className="text-sm font-bold text-violet-900">Tela da cozinha (KDS)</p>
            <p className="mt-1 text-xs text-violet-700">
              Acompanhe os pedidos em tempo real na tela de produção
            </p>
          </div>
          <span className="mt-4 inline-flex items-center self-start rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors group-hover:bg-violet-700">
            Abrir KDS →
          </span>
        </Link>
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="font-bold text-neutral-900">Últimos pedidos</h2>
          <span className="text-xs text-neutral-400">{stats.recentOrders.length} pedidos</span>
        </div>

        {stats.recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-neutral-400">
            <ShoppingBag className="h-10 w-10 opacity-20" />
            <p className="text-sm">Nenhum pedido ainda</p>
            <p className="text-xs">Faça um pedido no cardápio para testar</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {stats.recentOrders.map((order) => {
              const st = STATUS_LABELS[order.status];
              return (
                <div
                  key={order.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-700">
                    #{order.number}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-900">
                      {order.customerName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      {order.type === "delivery" ? (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" /> Delivery
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <Store className="h-3 w-3" /> Retirada
                        </span>
                      )}
                      <span>·</span>
                      <span>{METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
                      <span>·</span>
                      <span>{timeAgo(order.createdAt)}</span>
                    </div>
                  </div>

                  {st && (
                    <span
                      className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${st.color}`}
                    >
                      {st.label}
                    </span>
                  )}

                  <p className="shrink-0 text-sm font-bold text-neutral-900">
                    {formatBRL(Number(order.total))}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
