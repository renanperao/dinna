import { notFound } from "next/navigation";
import { History, Search, MapPin, Store, Filter, Download } from "lucide-react";
import { getRestaurantIdBySlug, getAdminStats } from "@/lib/queries/orders";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ slug: string }> }

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  awaiting_payment: { label: "Ag. Pagamento", cls: "bg-neutral-100 text-neutral-600" },
  received:         { label: "Recebido",       cls: "bg-amber-100 text-amber-800" },
  preparing:        { label: "Preparando",     cls: "bg-blue-100 text-blue-800" },
  ready:            { label: "Pronto",          cls: "bg-green-100 text-green-800" },
  out_for_delivery: { label: "Em entrega",     cls: "bg-indigo-100 text-indigo-800" },
  delivered:        { label: "Entregue",        cls: "bg-emerald-100 text-emerald-800" },
  cancelled:        { label: "Cancelado",       cls: "bg-red-100 text-red-800" },
};

const PAY: Record<string, string> = {
  pix: "PIX", credit: "Crédito", debit: "Débito",
  cash: "Dinheiro", on_delivery_card: "Cartão/Entrega", on_delivery_cash: "Dinheiro/Entrega",
};

export default async function HistoryPage({ params }: PageProps) {
  const { slug } = await params;
  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const { recentOrders } = await getAdminStats(restaurantId);
  const total = recentOrders.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Histórico de pedidos</h1>
          <p className="text-sm text-neutral-500">{recentOrders.length} pedidos · {formatBRL(total)} total</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700">
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input placeholder="Pesquise por cliente ou número do pedido" className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-violet-400 focus:outline-none" />
        </div>
        <select className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm">
          <option>Todos os status</option>
          {Object.values(STATUS_CFG).map(s => <option key={s.label}>{s.label}</option>)}
        </select>
        <select className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm">
          <option>Todas as formas</option>
          {Object.values(PAY).map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm">
          <option>Últimos 30 dias</option>
          <option>Hoje</option>
          <option>Esta semana</option>
          <option>Este mês</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-neutral-400">
            <History className="h-12 w-12 opacity-20" />
            <p className="text-sm">Nenhum pedido no período selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {recentOrders.map(o => {
                  const st = STATUS_CFG[o.status];
                  return (
                    <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-neutral-700">#{o.number}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{o.customerName}</td>
                      <td className="px-4 py-3 text-neutral-500">
                        {o.type === "delivery"
                          ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/> Delivery</span>
                          : <span className="flex items-center gap-1"><Store className="h-3 w-3"/> Retirada</span>}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{PAY[o.paymentMethod] ?? o.paymentMethod}</td>
                      <td className="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        {st && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-neutral-900">{formatBRL(Number(o.total))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 text-xs text-neutral-400">
              <span>Exibindo {recentOrders.length} pedidos</span>
              <span>{formatBRL(total)} em faturamento</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
