import { notFound } from "next/navigation";
import { History, MapPin, Store } from "lucide-react";
import { getRestaurantIdBySlug, getFilteredOrders } from "@/lib/queries/orders";
import { resolveOrdersPeriod } from "@/lib/orders-period";
import { formatBRL } from "@/lib/utils";
import { OrdersFilters } from "@/components/admin/orders-filters";
import { ExportCsvButton } from "@/components/admin/export-csv-button";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    status?: string;
    method?: string;
    type?: string;
    period?: string;
    q?: string;
  }>;
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  awaiting_payment: { label: "Ag. Pagamento", cls: "bg-neutral-100 text-neutral-600" },
  received: { label: "Recebido", cls: "bg-amber-100 text-amber-800" },
  preparing: { label: "Preparando", cls: "bg-blue-100 text-blue-800" },
  ready: { label: "Pronto", cls: "bg-green-100 text-green-800" },
  out_for_delivery: { label: "Em entrega", cls: "bg-indigo-100 text-indigo-800" },
  delivered: { label: "Entregue", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelado", cls: "bg-red-100 text-red-800" },
};

const PAY: Record<string, string> = {
  pix: "PIX",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
  on_delivery_card: "Cartão/Entrega",
  on_delivery_cash: "Dinheiro/Entrega",
};

export default async function HistoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const period = resolveOrdersPeriod(sp.period, "30d");

  const ordersList = await getFilteredOrders(restaurantId, {
    status: sp.status,
    paymentMethod: sp.method,
    type: sp.type,
    search: sp.q,
    from: period.from,
    to: period.to,
    limit: 500,
  });

  const total = ordersList.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Histórico de pedidos</h1>
          <p className="text-sm text-neutral-500">
            {ordersList.length} pedido{ordersList.length !== 1 ? "s" : ""} · {formatBRL(total)} ·{" "}
            {period.label.toLowerCase()}
          </p>
        </div>
        <ExportCsvButton slug={slug} />
      </div>

      <OrdersFilters showType defaultPeriod="30d" />

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {ordersList.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-neutral-400">
            <History className="h-12 w-12 opacity-20" />
            <p className="text-sm">Nenhum pedido para os filtros selecionados.</p>
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
                {ordersList.map((o) => {
                  const st = STATUS_CFG[o.status];
                  return (
                    <tr key={o.id} className="transition-colors hover:bg-neutral-50">
                      <td className="px-4 py-3 font-bold text-neutral-700">#{o.number}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{o.customerName}</td>
                      <td className="px-4 py-3 text-neutral-500">
                        {o.type === "delivery" ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Delivery
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3" /> Retirada
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {PAY[o.paymentMethod] ?? o.paymentMethod}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500">
                        {new Date(o.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {st && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>
                            {st.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-neutral-900">
                        {formatBRL(Number(o.total))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 text-xs text-neutral-400">
              <span>
                Exibindo {ordersList.length} pedido{ordersList.length !== 1 ? "s" : ""}
              </span>
              <span>{formatBRL(total)} em faturamento</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
