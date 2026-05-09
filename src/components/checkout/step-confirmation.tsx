"use client";

import { CheckCircle, MessageCircle, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL, formatPhone } from "@/lib/utils";
import type { Restaurant } from "@/lib/db/schema";
import type { OrderDraft } from "./checkout-modal";

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  credit: "Cartão de crédito",
  debit: "Cartão de débito",
  cash: "Dinheiro",
  on_delivery_card: "Cartão na entrega",
  on_delivery_cash: "Dinheiro na entrega",
};

interface Props {
  restaurant: Restaurant;
  draft: Required<OrderDraft>;
  onClose: () => void;
}

export function StepConfirmation({ restaurant, draft, onClose }: Props) {
  const { delivery, payment, deliveryFee, orderNumber } = draft;
  const isDelivery = delivery.type === "delivery";

  const estimatedMinutes = (() => {
    if (!isDelivery) return 20;
    const zones = restaurant.deliveryZones as Array<{ neighborhood: string; fee: number; maxMinutes: number }> | null;
    if (!zones) return 45;
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const zone = zones.find((z) => norm(z.neighborhood) === norm(delivery.neighborhood ?? ""));
    return zone?.maxMinutes ?? 45;
  })();

  function openWhatsApp() {
    const phone = restaurant.whatsapp.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Olá! Acabei de fazer o pedido *#${orderNumber}* pelo site. 😊`,
    );
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  }

  return (
    <div className="flex flex-col items-center px-5 py-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>

      <h2 className="mt-4 text-2xl font-bold text-neutral-900">Pedido recebido!</h2>
      <p className="mt-1 text-neutral-500">
        Pedido <strong className="text-neutral-900">#{orderNumber}</strong> confirmado
      </p>

      <div className="mt-6 w-full space-y-3 rounded-xl bg-neutral-50 p-4 text-left text-sm">
        <div className="flex items-start gap-3">
          {isDelivery ? <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" /> : <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />}
          <div>
            <p className="font-medium">{isDelivery ? "Entrega" : "Retirada"}</p>
            {isDelivery ? (
              <p className="text-neutral-500">
                {delivery.street}, {delivery.number}
                {delivery.complement ? ` - ${delivery.complement}` : ""} · {delivery.neighborhood}
              </p>
            ) : (
              <p className="text-neutral-500">
                {(restaurant.address as { street: string; number: string }).street},{" "}
                {(restaurant.address as { street: string; number: string }).number}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 shrink-0 text-neutral-400" />
          <div>
            <p className="font-medium">Tempo estimado</p>
            <p className="text-neutral-500">~{estimatedMinutes} minutos</p>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-3">
          <div className="flex justify-between text-neutral-600">
            <span>Pagamento</span>
            <span className="font-medium">{METHOD_LABELS[payment.method] ?? payment.method}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>Taxa de entrega</span>
              <span>{formatBRL(deliveryFee)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 w-full space-y-3">
        <Button size="lg" className="w-full" onClick={openWhatsApp}>
          <MessageCircle className="h-4 w-4" />
          Acompanhar no WhatsApp
        </Button>
        <Button variant="outline" size="lg" className="w-full" onClick={onClose}>
          Voltar ao cardápio
        </Button>
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        Dúvidas? Ligue: {formatPhone(restaurant.phone)}
      </p>
    </div>
  );
}
