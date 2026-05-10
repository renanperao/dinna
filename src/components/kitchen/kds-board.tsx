"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, MapPin, Store, ChefHat, CheckCircle, Bike, Wifi, WifiOff } from "lucide-react";
import { updateOrderStatus } from "@/actions/update-order-status";
import type { OrderWithItems } from "@/lib/queries/orders";
import { formatBRL } from "@/lib/utils";
import { useRealtimeOrders } from "./use-realtime-orders";

const STATUS_CONFIG = {
  received: {
    label: "Recebido",
    bg: "bg-amber-50",
    border: "border-amber-400",
    badge: "bg-amber-400 text-amber-950",
    nextStatus: "preparing" as const,
    nextLabel: "Iniciar preparo",
    nextColor: "bg-blue-600 hover:bg-blue-700",
    icon: <Clock className="h-4 w-4" />,
  },
  preparing: {
    label: "Preparando",
    bg: "bg-blue-50",
    border: "border-blue-400",
    badge: "bg-blue-500 text-white",
    nextStatus: "ready" as const,
    nextLabel: "Marcar pronto",
    nextColor: "bg-green-600 hover:bg-green-700",
    icon: <ChefHat className="h-4 w-4" />,
  },
  ready: {
    label: "Pronto!",
    bg: "bg-green-50",
    border: "border-green-500",
    badge: "bg-green-500 text-white",
    nextStatus: "out_for_delivery" as const,
    nextLabel: "Saiu para entrega",
    nextColor: "bg-neutral-700 hover:bg-neutral-800",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  out_for_delivery: {
    label: "Em entrega",
    bg: "bg-neutral-50",
    border: "border-neutral-300",
    badge: "bg-neutral-500 text-white",
    nextStatus: "delivered" as const,
    nextLabel: "Entregue",
    nextColor: "bg-neutral-400 hover:bg-neutral-500",
    icon: <Bike className="h-4 w-4" />,
  },
};

function elapsed(date: Date | null | string): string {
  const from = date ? new Date(date) : new Date();
  const mins = Math.floor((Date.now() - from.getTime()) / 60000);
  if (mins < 1) return "< 1 min";
  return `${mins} min`;
}

function KDSCard({ order, slug }: { order: OrderWithItems; slug: string }) {
  const [isPending, startTransition] = useTransition();
  const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
  if (!cfg) return null;

  const mins = order.receivedAt
    ? Math.floor((Date.now() - new Date(order.receivedAt).getTime()) / 60000)
    : 0;
  const isLate = mins > 25;

  return (
    <div
      className={`flex flex-col rounded-2xl border-2 ${cfg.border} ${cfg.bg} shadow-sm transition-all ${isLate && order.status !== "out_for_delivery" ? "ring-2 ring-red-400" : ""}`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between rounded-t-xl bg-white/60 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-neutral-900">#{order.number}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>
            {cfg.icon}
            {cfg.label}
          </span>
          {isLate && order.status !== "out_for_delivery" && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 animate-pulse">
              ⚠ Atrasado
            </span>
          )}
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${isLate ? "text-red-600" : "text-neutral-600"}`}>
            {elapsed(order.receivedAt ?? order.createdAt)}
          </p>
          <p className="flex items-center gap-1 text-xs text-neutral-500">
            {order.type === "delivery" ? (
              <><MapPin className="h-3 w-3" /> Delivery</>
            ) : (
              <><Store className="h-3 w-3" /> Retirada</>
            )}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 space-y-2 p-4">
        <p className="text-sm font-semibold text-neutral-700">{order.customerName}</p>
        <ul className="space-y-2">
          {order.items.map((item) => {
            const opts = item.options as Array<{ group: string; name: string }> | null;
            const flavors = item.flavors as Array<{ name: string }> | null;
            return (
              <li key={item.id} className="rounded-lg bg-white/70 px-3 py-2 text-sm shadow-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-neutral-900">
                    {item.quantity}× {item.productName}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-neutral-600">
                    {formatBRL(Number(item.totalPrice))}
                  </span>
                </div>
                {flavors && flavors.length > 1 && (
                  <p className="mt-0.5 text-xs text-blue-700">
                    ½ {flavors[0].name} / ½ {flavors[1].name}
                  </p>
                )}
                {opts && opts.length > 0 && (
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {opts.map((o) => `${o.group}: ${o.name}`).join(" · ")}
                  </p>
                )}
                {item.notes && (
                  <p className="mt-0.5 text-xs italic text-amber-700">📝 {item.notes}</p>
                )}
              </li>
            );
          })}
        </ul>
        {order.notes && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            📝 Obs: {order.notes}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/50 px-4 pb-4 pt-3">
        <div className="mb-2 flex items-center justify-between text-xs text-neutral-600">
          <span>{order.paymentMethod.toUpperCase()}</span>
          <span className="font-bold text-neutral-900">{formatBRL(Number(order.total))}</span>
        </div>
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(() =>
              updateOrderStatus(order.id, cfg.nextStatus, slug),
            )
          }
          className={`w-full rounded-xl py-2.5 text-sm font-bold text-white transition-colors ${cfg.nextColor} disabled:opacity-60`}
        >
          {isPending ? "Atualizando..." : cfg.nextLabel}
        </button>
      </div>
    </div>
  );
}

interface KDSBoardProps {
  orders: OrderWithItems[];
  slug: string;
  restaurantId: string;
}

const STATUS_ORDER = ["received", "preparing", "ready", "out_for_delivery"];
const STATUS_LABELS: Record<string, string> = {
  received: "🟡 Recebidos",
  preparing: "🔵 Preparando",
  ready: "🟢 Prontos",
  out_for_delivery: "⚫ Em entrega",
};

export function KDSBoard({ orders, slug, restaurantId }: KDSBoardProps) {
  const router = useRouter();
  const realtimeStatus = useRealtimeOrders(restaurantId);

  // Polling fallback: more aggressive when realtime is unavailable
  useEffect(() => {
    const interval = realtimeStatus === "connected" ? 30000 : 10000;
    const id = setInterval(() => router.refresh(), interval);
    return () => clearInterval(id);
  }, [router, realtimeStatus]);

  return (
    <>
      <RealtimeBadge status={realtimeStatus} />

      {orders.length === 0 ? (
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-neutral-400">
          <ChefHat className="h-16 w-16 opacity-20" />
          <p className="text-lg font-semibold">Nenhum pedido ativo</p>
          <p className="text-sm">Os pedidos aparecerão aqui assim que chegarem</p>
        </div>
      ) : (
        <KDSGrid orders={orders} slug={slug} />
      )}
    </>
  );
}

function RealtimeBadge({ status }: { status: ReturnType<typeof useRealtimeOrders> }) {
  if (status === "disabled") {
    return (
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">
        <WifiOff className="h-3 w-3" />
        Polling 10s · realtime desativado
      </div>
    );
  }
  if (status === "connected") {
    return (
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <Wifi className="h-3 w-3" />
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Tempo real ativo
      </div>
    );
  }
  if (status === "connecting") {
    return (
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <Wifi className="h-3 w-3 animate-pulse" />
        Conectando…
      </div>
    );
  }
  return (
    <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
      <WifiOff className="h-3 w-3" />
      Realtime offline · usando polling
    </div>
  );
}

function KDSGrid({ orders, slug }: { orders: OrderWithItems[]; slug: string }) {

  const byStatus = STATUS_ORDER.reduce(
    (acc, s) => {
      acc[s] = orders.filter((o) => o.status === s);
      return acc;
    },
    {} as Record<string, OrderWithItems[]>,
  );

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {STATUS_ORDER.map((status) => {
        const col = byStatus[status];
        return (
          <div key={status}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-600">
                {STATUS_LABELS[status]}
              </h2>
              {col.length > 0 && (
                <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-bold text-neutral-700">
                  {col.length}
                </span>
              )}
            </div>
            <div className="space-y-4">
              {col.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-neutral-200 p-6 text-center text-xs text-neutral-400">
                  Nenhum pedido
                </div>
              ) : (
                col.map((order) => (
                  <KDSCard key={order.id} order={order} slug={slug} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
