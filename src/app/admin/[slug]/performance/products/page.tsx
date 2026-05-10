import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { getRestaurantIdBySlug } from "@/lib/queries/orders";
import {
  getProductAnalytics,
  getProductABC,
  resolvePeriod,
  type PeriodKey,
} from "@/lib/queries/analytics";
import { formatBRL } from "@/lib/utils";
import { PeriodTabs, type PeriodValue } from "@/components/admin/period-tabs";
import { AbcCurveChart } from "@/components/admin/charts/abc-curve-chart";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string }>;
}

function isValidPeriod(value: string | undefined): value is PeriodValue {
  return value === "7d" || value === "30d" || value === "month";
}

const CLASS_BADGE: Record<"A" | "B" | "C", string> = {
  A: "bg-emerald-100 text-emerald-700",
  B: "bg-amber-100 text-amber-700",
  C: "bg-neutral-100 text-neutral-600",
};

export default async function ProductsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { period: periodParam } = await searchParams;
  const period: PeriodValue = isValidPeriod(periodParam) ? periodParam : "30d";

  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const range = resolvePeriod(period as PeriodKey);
  const [analytics, abc] = await Promise.all([
    getProductAnalytics(restaurantId, range.start, range.end),
    getProductABC(restaurantId, range.days),
  ]);

  const totals = analytics.reduce(
    (acc, row) => ({
      qty: acc.qty + row.totalQty,
      revenue: acc.revenue + row.totalRevenue,
    }),
    { qty: 0, revenue: 0 },
  );

  const abcCounts = abc.rows.reduce(
    (acc, r) => {
      acc[r.classification]++;
      return acc;
    },
    { A: 0, B: 0, C: 0 } as Record<"A" | "B" | "C", number>,
  );

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Análise dos produtos</h1>
          <p className="text-sm text-neutral-500">
            Curva ABC e desempenho por categoria · {range.label.toLowerCase()}
          </p>
        </div>
        <PeriodTabs active={period} />
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Margem de lucro será calculada quando os custos dos produtos estiverem cadastrados em{" "}
          <strong>Catálogo</strong>.
        </span>
      </div>

      {/* ABC Curve */}
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="font-bold text-neutral-900">Curva ABC dos produtos</h2>
            <p className="text-xs text-neutral-500">
              Classe A = primeiros 80% do faturamento · Classe B = próximos 15% · Classe C = últimos 5%
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> A: {abcCounts.A} produto
              {abcCounts.A !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> B: {abcCounts.B}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-600">
              <span className="h-2 w-2 rounded-full bg-neutral-400" /> C: {abcCounts.C}
            </span>
          </div>
        </div>

        {abc.rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            Sem dados no período selecionado.
          </p>
        ) : (
          <>
            <AbcCurveChart
              data={abc.rows.slice(0, 30).map((r) => ({
                productName: r.productName,
                revenue: r.revenue,
                cumulativePct: r.cumulativePct,
                classification: r.classification,
              }))}
            />

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Produto</th>
                    <th className="py-2 pr-4 text-right">Qtd</th>
                    <th className="py-2 pr-4 text-right">Faturamento</th>
                    <th className="py-2 pr-4 text-right">Acumulado</th>
                    <th className="py-2 text-right">Classe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {abc.rows.slice(0, 15).map((r, idx) => (
                    <tr key={`${r.productId ?? r.productName}-${idx}`}>
                      <td className="py-2 pr-4 text-neutral-400">{idx + 1}</td>
                      <td className="py-2 pr-4 font-medium text-neutral-900">{r.productName}</td>
                      <td className="py-2 pr-4 text-right text-neutral-700">{r.quantity}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-neutral-900">
                        {formatBRL(r.revenue)}
                      </td>
                      <td className="py-2 pr-4 text-right text-neutral-500">
                        {r.cumulativePct.toFixed(1)}%
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${CLASS_BADGE[r.classification]}`}
                        >
                          {r.classification}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {abc.rows.length > 15 ? (
                <p className="mt-3 text-xs text-neutral-400">
                  Exibindo top 15 de {abc.rows.length} produtos.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Por categoria */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="font-bold text-neutral-900">Desempenho por categoria</h2>
        </div>
        {analytics.length === 0 ? (
          <div className="py-16 text-center text-neutral-400">
            <p className="text-sm">Nenhum dado no período selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-5 py-3">Categoria</th>
                  <th className="px-5 py-3 text-right">Qtde vendida</th>
                  <th className="px-5 py-3 text-right">Preço médio</th>
                  <th className="px-5 py-3 text-right">Faturamento total</th>
                  <th className="px-5 py-3 text-right">% do total</th>
                  <th className="px-5 py-3 text-right">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {analytics.map((row) => {
                  const pct = totals.revenue > 0 ? (row.totalRevenue / totals.revenue) * 100 : 0;
                  return (
                    <tr
                      key={`${row.categoryId ?? "null"}-${row.categoryName}`}
                      className="transition-colors hover:bg-neutral-50"
                    >
                      <td className="px-5 py-4 font-semibold text-neutral-900">
                        {row.categoryName}
                      </td>
                      <td className="px-5 py-4 text-right text-neutral-700">{row.totalQty}</td>
                      <td className="px-5 py-4 text-right text-neutral-700">
                        {formatBRL(row.avgPrice)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-neutral-900">
                        {formatBRL(row.totalRevenue)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-700">
                            {pct.toFixed(1)}%
                          </span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100">
                            <div
                              className="h-full rounded-full bg-violet-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-neutral-300">—</td>
                    </tr>
                  );
                })}
                <tr className="bg-neutral-50 font-bold">
                  <td className="px-5 py-4 text-neutral-900">Total</td>
                  <td className="px-5 py-4 text-right text-neutral-900">{totals.qty}</td>
                  <td className="px-5 py-4 text-right text-neutral-400">—</td>
                  <td className="px-5 py-4 text-right text-neutral-900">
                    {formatBRL(totals.revenue)}
                  </td>
                  <td className="px-5 py-4 text-right text-neutral-400">100%</td>
                  <td className="px-5 py-4 text-right text-neutral-300">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
