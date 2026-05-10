import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, UserPlus, Repeat, UserMinus, Crown, MessageCircle } from "lucide-react";
import { getRestaurantIdBySlug } from "@/lib/queries/orders";
import { getCustomerInsights, type PeriodKey } from "@/lib/queries/analytics";
import { formatBRL, formatPhone } from "@/lib/utils";
import { PeriodTabs, type PeriodValue } from "@/components/admin/period-tabs";
import { TrendPill } from "@/components/admin/charts/trend-pill";
import { CustomerMixChart } from "@/components/admin/charts/customer-mix-chart";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string }>;
}

function isValidPeriod(value: string | undefined): value is PeriodValue {
  return value === "7d" || value === "30d" || value === "month";
}

function whatsappLink(phone: string, restaurantName: string) {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(
    `Olá! Aqui é a equipe da ${restaurantName}. Sentimos sua falta — tenho um cupom especial para você. 🍕`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

export default async function PerformanceCustomersPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { period: periodParam } = await searchParams;
  const period: PeriodValue = isValidPeriod(periodParam) ? periodParam : "30d";

  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const insights = await getCustomerInsights(restaurantId, period as PeriodKey);

  const recurringPct =
    insights.totals.activeInPeriod > 0
      ? (insights.totals.recurringInPeriod / insights.totals.activeInPeriod) * 100
      : 0;

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Desempenho · Clientes</h1>
          <p className="text-sm text-neutral-500">
            Aquisição, retenção e clientes inativos
          </p>
        </div>
        <PeriodTabs active={period} />
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total de clientes"
          value={insights.totals.total.toString()}
          icon={Users}
          color="text-violet-600"
          extra={<span className="text-xs text-neutral-500">cadastrados</span>}
        />
        <StatCard
          label="Novos no período"
          value={insights.totals.newInPeriod.toString()}
          icon={UserPlus}
          color="text-emerald-600"
          extra={
            <TrendPill
              current={insights.totals.newInPeriod}
              previous={insights.comparison.previousNew}
              suffix="vs período anterior"
            />
          }
        />
        <StatCard
          label="Taxa de recorrência"
          value={`${recurringPct.toFixed(0)}%`}
          icon={Repeat}
          color="text-blue-600"
          extra={
            <span className="text-xs text-neutral-500">
              {insights.totals.recurringInPeriod} de {insights.totals.activeInPeriod} ativos
            </span>
          }
        />
        <StatCard
          label="Inativos > 30 dias"
          value={insights.totals.inactiveOver30d.toString()}
          icon={UserMinus}
          color="text-amber-600"
          extra={<span className="text-xs text-neutral-500">candidatos a reativação</span>}
        />
      </div>

      {/* Mix chart */}
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-bold text-neutral-900">Novos vs recorrentes — diário</h2>
            <p className="text-xs text-neutral-500">
              Quem veio pela primeira vez no período × clientes que voltaram
            </p>
          </div>
          <TrendPill
            current={insights.totals.activeInPeriod}
            previous={insights.comparison.previousActive}
            suffix="vs período anterior"
          />
        </div>
        <CustomerMixChart data={insights.newVsRecurringByDay} />
      </div>

      {/* Top customers + Inactive */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            <h2 className="font-bold text-neutral-900">Top 10 clientes (LTV)</h2>
          </div>
          {insights.topCustomers.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">Sem dados ainda</p>
          ) : (
            <div className="divide-y divide-neutral-50">
              {insights.topCustomers.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/admin/${slug}/customers#${c.id}`}
                  className="flex items-center gap-3 py-3 transition-colors hover:bg-neutral-50"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-700">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-900">
                      {c.name ?? formatPhone(c.phone)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {c.totalOrders} pedido{c.totalOrders !== 1 ? "s" : ""} · ticket médio{" "}
                      {formatBRL(c.avgTicket)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-neutral-900">
                    {formatBRL(c.totalSpent)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserMinus className="h-4 w-4 text-amber-500" />
            <h2 className="font-bold text-neutral-900">Reative seus clientes inativos</h2>
          </div>
          <p className="mb-3 text-xs text-neutral-500">
            Sem pedido há mais de 30 dias · ordenados por LTV
          </p>
          {insights.inactiveCustomers.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">
              Nenhum cliente inativo 🎉
            </p>
          ) : (
            <div className="divide-y divide-neutral-50">
              {insights.inactiveCustomers.slice(0, 10).map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-900">
                      {c.name ?? formatPhone(c.phone)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Último pedido há {c.daysSinceLastOrder} dias · {formatBRL(c.totalSpent)} de
                      LTV
                    </p>
                  </div>
                  <a
                    href={whatsappLink(c.phone, "sua pizzaria")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  extra,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-2xl font-black text-neutral-900">{value}</p>
      {extra ? <div className="mt-2">{extra}</div> : null}
    </div>
  );
}
