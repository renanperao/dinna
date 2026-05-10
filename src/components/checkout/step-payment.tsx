"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, QrCode, CreditCard, Banknote, Wallet } from "lucide-react";
import { toast } from "sonner";
import { paymentSchema, type PaymentInfo } from "@/lib/validations/checkout";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/utils";
import { createOrder } from "@/actions/create-order";
import { useCartStore } from "@/stores/cart-store";
import type { Restaurant } from "@/lib/db/schema";
import type { OrderDraft } from "./checkout-modal";
import type { CartItem } from "@/stores/cart-store";
import { cn } from "@/lib/utils";

interface Props {
  restaurant: Restaurant;
  draft: OrderDraft;
  items: CartItem[];
  onNext: (payment: PaymentInfo, orderId: string, orderNumber: number) => void;
}

type Method = PaymentInfo["method"];

const METHODS: { value: Method; label: string; icon: React.ReactNode; onDelivery?: boolean }[] = [
  { value: "pix", label: "PIX", icon: <QrCode className="h-5 w-5" /> },
  { value: "credit", label: "Cartão de crédito", icon: <CreditCard className="h-5 w-5" /> },
  { value: "debit", label: "Cartão de débito", icon: <CreditCard className="h-5 w-5" /> },
  { value: "on_delivery_card", label: "Cartão na entrega", icon: <Wallet className="h-5 w-5" />, onDelivery: true },
  { value: "on_delivery_cash", label: "Dinheiro na entrega", icon: <Banknote className="h-5 w-5" />, onDelivery: true },
];

export function StepPayment({ restaurant, draft, items, onNext }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const clearCart = useCartStore((s) => s.clear);

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const deliveryFee = draft.deliveryFee ?? 0;
  const total = subtotal + deliveryFee;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PaymentInfo>({
    resolver: zodResolver(paymentSchema),
    defaultValues: draft.payment ?? { method: "pix" },
  });

  const method = watch("method");
  const availableMethods = METHODS.filter(
    (m) => !m.onDelivery || draft.delivery.type === "delivery",
  );

  async function onSubmit(payment: PaymentInfo) {
    setSubmitting(true);
    try {
      const result = await createOrder({
        restaurantSlug: restaurant.slug,
        items,
        checkout: { ...draft.delivery, ...payment },
        deliveryFee,
      });
      if (!result.success) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }
      clearCart();
      onNext(payment, result.orderId, result.orderNumber);
    } catch {
      toast.error("Erro ao criar pedido. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-5 py-5">
      {/* Order summary */}
      <div className="rounded-xl bg-neutral-50 p-4 text-sm">
        <h3 className="mb-2 font-semibold text-neutral-700">Resumo do pedido</h3>
        <ul className="space-y-1 text-neutral-600">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span className="truncate">{item.quantity}× {item.displayName}</span>
              <span className="shrink-0">{formatBRL(item.unitPrice * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-neutral-200 pt-3 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span><span>{formatBRL(subtotal)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>Entrega</span><span>{formatBRL(deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-neutral-900">
            <span>Total</span><span>{formatBRL(total)}</span>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">Forma de pagamento</h3>
        {availableMethods.map((m) => (
          <label key={m.value} className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors",
            method === m.value ? "border-[var(--color-brand)] bg-red-50" : "border-neutral-200 hover:border-neutral-300",
          )}>
            <input type="radio" value={m.value} {...register("method")} className="sr-only" />
            <span className="text-neutral-500">{m.icon}</span>
            <span className="text-sm font-medium">{m.label}</span>
          </label>
        ))}
        {errors.method && <p className="text-xs text-red-600">{errors.method.message}</p>}
      </div>

      {/* Troco */}
      {method === "on_delivery_cash" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Troco para</label>
          <input
            type="number"
            step="0.01"
            {...register("changeFor", { valueAsNumber: true })}
            placeholder={`${total.toFixed(2)}`}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
          />
        </div>
      )}

      {/* Observações */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">Observações do pedido</label>
        <textarea
          {...register("notes")}
          rows={2}
          placeholder="Alguma instrução especial para o restaurante..."
          className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
          maxLength={300}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : `Confirmar pedido · ${formatBRL(total)}`}
      </Button>
    </form>
  );
}
