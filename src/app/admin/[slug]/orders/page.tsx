import { notFound } from "next/navigation";
import { ShoppingBag, MapPin, Store } from "lucide-react";
import { getRestaurantIdBySlug, getFilteredOrders } from "@/lib/queries/orders";
import { resolveOrdersPeriod } from "@/lib/orders-period";
import { formatBRL } from "@/lib/utils";
import { updateOrderStatus } from "@/actions/update-order-status";
import { OrdersFilters } from "@/components/admin/orders-filters";

export const revalidate = 15;

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

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; next?: string; nextLabel?: string }
> = {
  awaiting_payment: { label: "Ag. Pagamento", badge: "bg-neutral-100 text-neutral-700" },
  received: { label: "Recebido", badge: "bg-amber-100 text-amber-800", next: "preparing", nextLabel: "Iniciar preparo" },
  preparing: { label: "Preparando", badge: "bg-blue-100 text-blue-800", next: "ready", nextLabel: "Marcar pronto" },
  ready: { label: "Pronto", badge: "bg-green-100 text-green-800", next: "out_for_delivery", nextLabel: "Saiu p/ entrega" },
  out_for_delivery: { label: "Em entrega", badge: "bg-indigo-100 text-indigo-800", next: "delivered", nextLabel: "Entregue" },
  delivered: { label: "Entregue", badge: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelado", badge: "bg-red-100 text-red-800" },
};

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
  on_delivery_card: "Cartão/Entrega",
  on_delivery_cash: "Dinheiro/Entrega",
};

export default async function OrdersPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) notFound();

  const period = resolveOrdersPeriod(sp.period, "today");

  const ordersList = await getFilteredOrders(restaurantId, {
    status: sp.status,
    paymentMethod: sp.method,
    type: sp.type,
    search: sp.q,
    from: period.from,
    to: period.to,
    limit: 200,
  });

  const total = ordersList.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Pedidos</h1>
        <p className="text-sm text-neutral-500">
          {ordersList.length} pedido{ordersList.length !== 1 ? "s" : ""} · {formatBRL(total)} ·{" "}
          {period.label.toLowerCase()}
        </p>
      </div>

      <OrdersFilters showType defaultPeriod="today" />

      {ordersList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white py-20 text-neutral-400 shadow-sm">
          <ShoppingBag className="h-12 w-12 opacity-20" />
          <p>Nenhum pedido para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="divide-y divide-neutral-100">
            {ordersList.map((order) => {
              const st = STATUS_CONFIG[order.status];
              return (
                <div key={order.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="w-8 text-sm font-black text-neutral-700">#{order.number}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-900">
                      {order.customerName}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {order.type === "delivery" ? (
                        <>
                          <MapPin className="inline h-3 w-3" /> Delivery
                        </>
                      ) : (
                        <>
                          <Store className="inline h-3 w-3" /> Retirada
                        </>
                      )}
                      {" · "}
                      {METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                      {" · "}
                      {new Date(order.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {st && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.badge}`}>
                      {st.label}
                    </span>
                  )}
                  <span className="text-sm font-bold">{formatBRL(Number(order.total))}</span>
                  {st?.next && (
                    <form
                      action={async () => {
                        "use server";
                        await updateOrderStatus(
                          order.id,
                          st.next as Parameters<typeof updateOrderStatus>[1],
                          slug,
                        );
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                      >
                        {st.nextLabel}
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
