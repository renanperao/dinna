import { notFound } from "next/navigation";
import { Download, Filter } from "lucide-react";
import { getRestaurantIdBySlug } from "@/lib/queries/orders";
import { getProductAnalytics } from "@/lib/queries/analytics";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ slug: string }> }

export default async function ProductsPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const analytics = await getProductAnalytics(restaurantId);

  const totals = analytics.reduce(
    (acc, row) => ({
      qty: acc.qty + row.totalQty,
      revenue: acc.revenue + row.totalRevenue,
      profit: acc.profit + row.profit,
    }),
    { qty: 0, revenue: 0, profit: 0 },
  );

  return (
    <div className="px-5 py-6 sm:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Análise dos produtos</h1>
          <p className="text-sm text-neutral-500">Desempenho por categoria nos últimos 30 dias</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50">
            <Filter className="h-3.5 w-3.5" />
            Filtros avançados
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700">
            <Download className="h-3.5 w-3.5" />
            Exportar
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
        <span className="mt-0.5 text-base">ℹ️</span>
        <span>Os custos não estão cadastrados. Adicione os custos dos produtos em <strong>Catálogo</strong> para calcular a margem real.</span>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option>Categorias</option>
          <option>Produtos</option>
        </select>
        <input
          type="text"
          placeholder="Pesquisa por categoria"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600">
          📅 Últimos 30 dias
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {analytics.length === 0 ? (
          <div className="py-20 text-center text-neutral-400">
            <p className="text-sm">Nenhum dado no período selecionado.</p>
            <p className="text-xs mt-1">Faça pedidos de teste no cardápio para popular esta tela.</p>
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
                  <th className="px-5 py-3 text-right">Custo médio</th>
                  <th className="px-5 py-3 text-right">Custo total</th>
                  <th className="px-5 py-3 text-right">Lucro</th>
                  <th className="px-5 py-3 text-right">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {analytics.map((row) => (
                  <tr key={row.categoryName} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-neutral-900">{row.categoryName}</td>
                    <td className="px-5 py-4 text-right text-neutral-700">{row.totalQty}</td>
                    <td className="px-5 py-4 text-right text-neutral-700">{formatBRL(row.avgPrice)}</td>
                    <td className="px-5 py-4 text-right font-semibold text-neutral-900">{formatBRL(row.totalRevenue)}</td>
                    <td className="px-5 py-4 text-right text-neutral-400">R$ 0,00</td>
                    <td className="px-5 py-4 text-right text-neutral-400">R$ 0,00</td>
                    <td className="px-5 py-4 text-right font-semibold text-emerald-700">{formatBRL(row.profit)}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        100%
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-neutral-50 font-bold">
                  <td className="px-5 py-4 text-neutral-900">Total</td>
                  <td className="px-5 py-4 text-right text-neutral-900">{totals.qty}</td>
                  <td className="px-5 py-4 text-right text-neutral-400">—</td>
                  <td className="px-5 py-4 text-right text-neutral-900">{formatBRL(totals.revenue)}</td>
                  <td className="px-5 py-4 text-right text-neutral-400">—</td>
                  <td className="px-5 py-4 text-right text-neutral-400">R$ 0,00</td>
                  <td className="px-5 py-4 text-right text-emerald-700">{formatBRL(totals.profit)}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">100%</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 text-xs text-neutral-400">
              <span>Registros por página: 10</span>
              <span>1–{analytics.length} de {analytics.length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
