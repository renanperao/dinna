import { NextRequest } from "next/server";
import { getRestaurantIdBySlug, getFilteredOrders } from "@/lib/queries/orders";
import { resolveOrdersPeriod } from "@/lib/orders-period";

const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: "Ag. Pagamento",
  received: "Recebido",
  preparing: "Preparando",
  ready: "Pronto",
  out_for_delivery: "Em entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
  on_delivery_card: "Cartão/Entrega",
  on_delivery_cash: "Dinheiro/Entrega",
};

const TYPE_LABELS: Record<string, string> = {
  delivery: "Delivery",
  pickup: "Retirada",
  dine_in: "Mesa",
};

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return new Response("Missing slug", { status: 400 });

  const restaurantId = await getRestaurantIdBySlug(slug);
  if (!restaurantId) return new Response("Restaurant not found", { status: 404 });

  const period = resolveOrdersPeriod(url.searchParams.get("period") ?? undefined, "30d");
  const rows = await getFilteredOrders(restaurantId, {
    status: url.searchParams.get("status") ?? undefined,
    paymentMethod: url.searchParams.get("method") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    search: url.searchParams.get("q") ?? undefined,
    from: period.from,
    to: period.to,
    limit: 5000,
  });

  const headers = [
    "Numero",
    "Data",
    "Cliente",
    "Telefone",
    "Tipo",
    "Status",
    "Pagamento",
    "Subtotal",
    "Taxa entrega",
    "Desconto",
    "Total",
    "Cupom",
    "Observacoes",
  ];

  const lines = [headers.join(";")];
  for (const r of rows) {
    lines.push(
      [
        r.number,
        new Date(r.createdAt).toLocaleString("pt-BR"),
        csvEscape(r.customerName),
        csvEscape(r.customerPhone),
        TYPE_LABELS[r.type] ?? r.type,
        STATUS_LABELS[r.status] ?? r.status,
        METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod,
        Number(r.subtotal).toFixed(2).replace(".", ","),
        Number(r.deliveryFee ?? 0).toFixed(2).replace(".", ","),
        Number(r.discount ?? 0).toFixed(2).replace(".", ","),
        Number(r.total).toFixed(2).replace(".", ","),
        csvEscape(r.couponCode ?? ""),
        csvEscape(r.notes ?? ""),
      ].join(";"),
    );
  }

  const csv = "﻿" + lines.join("\n"); // BOM for Excel
  const filename = `pedidos-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
