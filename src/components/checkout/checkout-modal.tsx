"use client";

import { useState } from "react";
import { X, ChevronLeft } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { StepDelivery } from "./step-delivery";
import { StepPayment } from "./step-payment";
import { StepConfirmation } from "./step-confirmation";
import type { Restaurant } from "@/lib/db/schema";
import type { DeliveryInfo, PaymentInfo } from "@/lib/validations/checkout";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  restaurant: Restaurant;
}

type Step = "delivery" | "payment" | "confirmation";

export interface OrderDraft {
  delivery: DeliveryInfo;
  payment: PaymentInfo;
  deliveryFee: number;
  orderId?: string;
  orderNumber?: number;
}

const STEP_LABELS: Record<Step, string> = {
  delivery: "Entrega",
  payment: "Pagamento",
  confirmation: "Confirmação",
};
const STEPS: Step[] = ["delivery", "payment", "confirmation"];

export function CheckoutModal({ open, onClose, restaurant }: CheckoutModalProps) {
  const [step, setStep] = useState<Step>("delivery");
  const [draft, setDraft] = useState<Partial<OrderDraft>>({});
  const items = useCartStore((s) => s.items);

  if (!open) return null;

  const stepIndex = STEPS.indexOf(step);

  function handleClose() {
    setStep("delivery");
    setDraft({});
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={step !== "confirmation" ? handleClose : undefined} aria-hidden />
      <div className="relative flex max-h-[96vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-4">
          {stepIndex > 0 && step !== "confirmation" ? (
            <button onClick={() => setStep(STEPS[stepIndex - 1])} className="rounded-full p-1 hover:bg-neutral-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div className="flex-1">
            <h2 className="text-base font-bold">{STEP_LABELS[step]}</h2>
            <div className="mt-1 flex gap-1">
              {STEPS.map((s, i) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIndex ? "bg-[var(--color-brand)]" : "bg-neutral-200"}`} />
              ))}
            </div>
          </div>
          {step !== "confirmation" ? (
            <button onClick={handleClose} className="rounded-full p-1 hover:bg-neutral-100" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto">
          {step === "delivery" && (
            <StepDelivery
              restaurant={restaurant}
              items={items}
              initialValues={draft.delivery}
              onNext={(delivery, deliveryFee) => {
                setDraft((d) => ({ ...d, delivery, deliveryFee }));
                setStep("payment");
              }}
            />
          )}
          {step === "payment" && draft.delivery && (
            <StepPayment
              restaurant={restaurant}
              draft={draft as OrderDraft}
              items={items}
              onNext={(payment, orderId, orderNumber) => {
                setDraft((d) => ({ ...d, payment, orderId, orderNumber }));
                setStep("confirmation");
              }}
            />
          )}
          {step === "confirmation" && draft.orderId && (
            <StepConfirmation
              restaurant={restaurant}
              draft={draft as Required<OrderDraft>}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
