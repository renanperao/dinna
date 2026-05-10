"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createCoupon, type CouponInput } from "@/actions/coupons";

interface CouponFormDialogProps {
  slug: string;
  open: boolean;
  onClose: () => void;
}

const TYPES = [
  { value: "percentage" as const, label: "Percentual (%)" },
  { value: "fixed" as const, label: "Valor fixo (R$)" },
  { value: "free_delivery" as const, label: "Frete grátis" },
];

export function CouponFormDialog({ slug, open, onClose }: CouponFormDialogProps) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<CouponInput["discountType"]>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [description, setDescription] = useState("");

  function reset() {
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinOrderValue("");
    setMaxUses("");
    setValidUntil("");
    setDescription("");
    setErrors({});
  }

  function close() {
    reset();
    onClose();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const payload: CouponInput = {
      code: code.trim(),
      discountType,
      discountValue:
        discountType === "free_delivery" ? 0 : Number(discountValue.replace(",", ".")),
      minOrderValue: minOrderValue ? Number(minOrderValue.replace(",", ".")) : null,
      maxUses: maxUses ? Number(maxUses) : null,
      validUntil: validUntil || null,
      description: description.trim() || null,
    };

    startTransition(async () => {
      const result = await createCoupon(slug, payload);
      if (result.ok) {
        toast.success("Cupom criado");
        close();
      } else {
        toast.error(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors);
      }
    });
  }

  if (!open) return null;

  function fieldClass(key: string) {
    return `w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none ${
      errors[key]
        ? "border-red-300 focus:border-red-400"
        : "border-neutral-200 focus:border-violet-400"
    }`;
  }

  return (
    <div
      onClick={close}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">Novo cupom</h2>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Código
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="BEMVINDO10"
              className={`${fieldClass("code")} font-mono uppercase tracking-widest`}
              maxLength={20}
              autoFocus
            />
            {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Tipo de desconto
            </label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as CouponInput["discountType"])}
              className={fieldClass("discountType")}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {discountType !== "free_delivery" && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Valor do desconto {discountType === "percentage" ? "(%)" : "(R$)"}
              </label>
              <input
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                inputMode="decimal"
                placeholder={discountType === "percentage" ? "10" : "15,00"}
                className={fieldClass("discountValue")}
              />
              {errors.discountValue && (
                <p className="mt-1 text-xs text-red-600">{errors.discountValue}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Pedido mínimo (R$)
              </label>
              <input
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                inputMode="decimal"
                placeholder="50,00"
                className={fieldClass("minOrderValue")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Limite de usos
              </label>
              <input
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                inputMode="numeric"
                placeholder="Sem limite"
                className={fieldClass("maxUses")}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Válido até
            </label>
            <input
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              type="date"
              className={fieldClass("validUntil")}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Descrição (opcional)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="10% off na primeira compra"
              className={fieldClass("description")}
              maxLength={200}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {pending ? "Criando..." : "Criar cupom"}
          </button>
        </div>
      </form>
    </div>
  );
}
