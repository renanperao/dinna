"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Store, Loader2 } from "lucide-react";
import { deliveryInfoSchema, type DeliveryInfo } from "@/lib/validations/checkout";
import { fetchCep, getDeliveryFeeForNeighborhood, getMinDeliveryFee } from "@/lib/queries/delivery";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/utils";
import type { Restaurant } from "@/lib/db/schema";
import type { CartItem } from "@/stores/cart-store";

interface Props {
  restaurant: Restaurant;
  items: CartItem[];
  initialValues?: DeliveryInfo;
  onNext: (delivery: DeliveryInfo, deliveryFee: number) => void;
}

export function StepDelivery({ restaurant, items, initialValues, onNext }: Props) {
  const [cepLoading, setCepLoading] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [feeError, setFeeError] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DeliveryInfo>({
    resolver: zodResolver(deliveryInfoSchema),
    defaultValues: initialValues ?? { type: "delivery" },
  });

  const type = watch("type");
  const neighborhood = watch("neighborhood");

  useEffect(() => {
    if (type === "delivery" && neighborhood) {
      const result = getDeliveryFeeForNeighborhood(restaurant, neighborhood);
      if (result) {
        setDeliveryFee(result.fee);
        setFeeError(null);
      } else {
        setDeliveryFee(0);
        setFeeError("Bairro fora da área de entrega. Entre em contato para verificar.");
      }
    } else {
      setDeliveryFee(0);
      setFeeError(null);
    }
  }, [neighborhood, type, restaurant]);

  async function lookupCep(cep: string) {
    if (cep.replace(/\D/g, "").length !== 8) return;
    setCepLoading(true);
    const data = await fetchCep(cep);
    setCepLoading(false);
    if (data) {
      setValue("street", data.logradouro, { shouldValidate: true });
      setValue("neighborhood", data.bairro, { shouldValidate: true });
    }
  }

  const minDeliveryFee = getMinDeliveryFee(restaurant);

  function onSubmit(data: DeliveryInfo) {
    if (data.type === "delivery" && feeError) return;
    onNext(data, deliveryFee);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-5 py-5">
      {/* Tipo */}
      <div className="grid grid-cols-2 gap-3">
        {(["delivery", "pickup"] as const).map((t) => (
          <label key={t} className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${type === t ? "border-[var(--color-brand)] bg-red-50" : "border-neutral-200"}`}>
            <input type="radio" value={t} {...register("type")} className="sr-only" />
            {t === "delivery" ? <MapPin className="h-6 w-6" /> : <Store className="h-6 w-6" />}
            <span className="text-sm font-semibold">{t === "delivery" ? "Delivery" : "Retirar"}</span>
            {t === "delivery" && minDeliveryFee > 0 ? (
              <span className="text-xs text-neutral-500">a partir de {formatBRL(minDeliveryFee)}</span>
            ) : t === "pickup" ? (
              <span className="text-xs text-neutral-500">Grátis</span>
            ) : null}
          </label>
        ))}
      </div>

      {/* Dados pessoais */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">Seus dados</h3>
        <Field label="Nome completo" error={errors.name?.message}>
          <input {...register("name")} placeholder="João Silva" className={inputCls(!!errors.name)} />
        </Field>
        <Field label="WhatsApp / Telefone" error={errors.phone?.message}>
          <input {...register("phone")} placeholder="(11) 99999-1234" className={inputCls(!!errors.phone)} />
        </Field>
      </div>

      {/* Endereço */}
      {type === "delivery" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">Endereço de entrega</h3>
          <Field label="CEP" error={errors.cep?.message}>
            <div className="relative">
              <input
                {...register("cep")}
                placeholder="00000-000"
                className={inputCls(!!errors.cep) + " pr-10"}
                onBlur={(e) => lookupCep(e.target.value)}
              />
              {cepLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-neutral-400" />}
            </div>
          </Field>
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <Field label="Rua" error={errors.street?.message}>
              <input {...register("street")} placeholder="Rua das Flores" className={inputCls(!!errors.street)} />
            </Field>
            <Field label="Nº" error={errors.number?.message}>
              <input {...register("number")} placeholder="123" className={inputCls(!!errors.number)} />
            </Field>
          </div>
          <Field label="Complemento" error={errors.complement?.message}>
            <input {...register("complement")} placeholder="Apto, bloco..." className={inputCls(false)} />
          </Field>
          <Field label="Bairro" error={errors.neighborhood?.message}>
            <input {...register("neighborhood")} placeholder="Centro" className={inputCls(!!errors.neighborhood)} />
          </Field>
          <Field label="Ponto de referência" error={undefined}>
            <input {...register("reference")} placeholder="Próximo ao mercado..." className={inputCls(false)} />
          </Field>

          {/* Fee info */}
          {feeError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{feeError}</p>
          ) : neighborhood && deliveryFee >= 0 ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
              Taxa de entrega: <strong>{deliveryFee === 0 ? "Grátis" : formatBRL(deliveryFee)}</strong>
              {" · "}Total: <strong>{formatBRL(subtotal + deliveryFee)}</strong>
            </p>
          ) : null}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || (type === "delivery" && !!feeError)}>
        Continuar para pagamento
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-700">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] ${hasError ? "border-red-400" : "border-neutral-300"}`;
}
