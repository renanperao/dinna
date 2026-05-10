"use client";

import { useState, useTransition } from "react";
import { Percent, Ticket, Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { toggleCoupon, deleteCoupon } from "@/actions/coupons";
import type { CouponRow } from "@/lib/queries/coupons";
import { CouponFormDialog } from "./coupon-form-dialog";
import { formatBRL } from "@/lib/utils";

interface Props {
  slug: string;
  coupons: CouponRow[];
}

function formatDate(d: Date | null) {
  if (!d) return "Sem expiração";
  return new Date(d).toLocaleDateString("pt-BR");
}

export function CouponsListClient({ slug, coupons }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleToggle(coupon: CouponRow) {
    setPendingId(coupon.id);
    startTransition(async () => {
      const result = await toggleCoupon(slug, coupon.id);
      setPendingId(null);
      if (result.ok) toast.success(coupon.isActive ? "Cupom desativado" : "Cupom ativado");
      else toast.error(result.error);
    });
  }

  function handleDelete(coupon: CouponRow) {
    if (!confirm(`Excluir o cupom "${coupon.code}"? Esta ação não pode ser desfeita.`)) return;
    setPendingId(coupon.id);
    startTransition(async () => {
      const result = await deleteCoupon(slug, coupon.id);
      setPendingId(null);
      if (result.ok) toast.success("Cupom excluído");
      else toast.error(result.error);
    });
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Cupons e descontos</h1>
          <p className="text-sm text-neutral-500">
            {coupons.length} cupom{coupons.length !== 1 ? "s" : ""} ·{" "}
            {coupons.filter((c) => c.isActive).length} ativo
            {coupons.filter((c) => c.isActive).length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
        >
          <PlusCircle className="h-3.5 w-3.5" /> Criar cupom
        </button>
      </div>

      {coupons.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white py-20 text-neutral-400 shadow-sm">
          <Ticket className="h-12 w-12 opacity-20" />
          <p className="text-sm font-semibold">Nenhum cupom cadastrado</p>
          <p className="text-xs">
            Crie seu primeiro cupom para oferecer desconto aos clientes.
          </p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Criar primeiro cupom
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {coupons.map((coupon) => {
            const isPending = pendingId === coupon.id;
            const value = Number(coupon.discountValue);
            const minOrder = coupon.minOrderValue ? Number(coupon.minOrderValue) : null;
            const usesPct =
              coupon.maxUses && coupon.maxUses > 0
                ? Math.min(((coupon.usesCount ?? 0) / coupon.maxUses) * 100, 100)
                : null;
            return (
              <div
                key={coupon.id}
                className={`rounded-2xl border-2 bg-white p-5 shadow-sm transition-colors ${
                  coupon.isActive ? "border-violet-100" : "border-neutral-100 opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 px-4 py-2">
                      <span className="font-mono text-lg font-black tracking-widest text-violet-700">
                        {coupon.code}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-neutral-900">
                          {coupon.discountType === "percentage" && (
                            <span className="flex items-center gap-1">
                              <Percent className="h-4 w-4 text-violet-500" /> {value}% de
                              desconto
                            </span>
                          )}
                          {coupon.discountType === "fixed" && (
                            <span className="flex items-center gap-1">
                              <Ticket className="h-4 w-4 text-blue-500" /> {formatBRL(value)} de
                              desconto
                            </span>
                          )}
                          {coupon.discountType === "free_delivery" && (
                            <span className="flex items-center gap-1">
                              <Ticket className="h-4 w-4 text-emerald-500" /> Frete grátis
                            </span>
                          )}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            coupon.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {coupon.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {minOrder ? `Pedido mínimo ${formatBRL(minOrder)} · ` : ""}
                        Válido até {formatDate(coupon.validUntil)}
                      </p>
                      {coupon.description && (
                        <p className="mt-0.5 text-xs italic text-neutral-500">
                          {coupon.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-neutral-900">
                        {coupon.usesCount ?? 0}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {coupon.maxUses ? `de ${coupon.maxUses} usos` : "usos (sem limite)"}
                      </p>
                      {usesPct !== null && (
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{ width: `${usesPct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(coupon)}
                        disabled={isPending}
                        className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-60"
                      >
                        {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                        {coupon.isActive ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(coupon)}
                        disabled={isPending}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CouponFormDialog
        slug={slug}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
