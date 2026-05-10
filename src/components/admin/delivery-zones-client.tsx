"use client";

import { useState, useTransition } from "react";
import {
  Bike,
  CheckCircle,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  addDeliveryZone,
  deleteDeliveryZone,
  updateDeliveryZone,
  type DeliveryZone,
  type ZoneInput,
} from "@/actions/delivery-zones";
import { formatBRL } from "@/lib/utils";

interface Props {
  slug: string;
  zones: DeliveryZone[];
}

interface DialogState {
  open: boolean;
  index: number | null;
  initial: ZoneInput;
}

const EMPTY: ZoneInput = { neighborhood: "", fee: 0, maxMinutes: 30 };

export function DeliveryZonesClient({ slug, zones }: Props) {
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    index: null,
    initial: EMPTY,
  });
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  function openCreate() {
    setDialog({ open: true, index: null, initial: EMPTY });
  }

  function openEdit(zone: DeliveryZone, index: number) {
    setDialog({ open: true, index, initial: { ...zone } });
  }

  function close() {
    setDialog({ open: false, index: null, initial: EMPTY });
  }

  function handleDelete(zone: DeliveryZone, index: number) {
    if (!confirm(`Remover a zona "${zone.neighborhood}"?`)) return;
    setPendingIndex(index);
    startTransition(async () => {
      const result = await deleteDeliveryZone(slug, index);
      setPendingIndex(null);
      if (result.ok) toast.success("Zona removida");
      else toast.error(result.error);
    });
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Delivery</h1>
          <p className="text-sm text-neutral-500">
            {zones.length} zona{zones.length !== 1 ? "s" : ""} cadastrada
            {zones.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
        >
          <Plus className="h-3.5 w-3.5" /> Nova zona
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          {
            label: "Zonas cadastradas",
            value: zones.length.toString(),
            icon: Bike,
            color: "bg-blue-100 text-blue-600",
          },
          {
            label: "Taxa mínima",
            value: zones.length ? formatBRL(Math.min(...zones.map((z) => z.fee))) : "—",
            icon: Bike,
            color: "bg-emerald-100 text-emerald-600",
          },
          {
            label: "Prazo máximo",
            value: zones.length
              ? `${Math.max(...zones.map((z) => z.maxMinutes))} min`
              : "—",
            icon: Bike,
            color: "bg-amber-100 text-amber-600",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {card.label}
                </p>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="text-2xl font-black text-neutral-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Zones table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="font-bold text-neutral-900">Zonas de entrega</h2>
        </div>
        {zones.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-neutral-400">
            <Bike className="h-12 w-12 opacity-20" />
            <p className="text-sm">Nenhuma zona cadastrada.</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-1 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" /> Criar primeira zona
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-5 py-3">Bairro / Região</th>
                  <th className="px-5 py-3 text-right">Taxa de entrega</th>
                  <th className="px-5 py-3 text-right">Tempo estimado</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {zones.map((zone, i) => {
                  const isPending = pendingIndex === i;
                  return (
                    <tr key={`${zone.neighborhood}-${i}`} className="transition-colors hover:bg-neutral-50">
                      <td className="px-5 py-4 font-medium text-neutral-900">
                        {zone.neighborhood}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-neutral-900">
                        {formatBRL(zone.fee)}
                      </td>
                      <td className="px-5 py-4 text-right text-neutral-600">
                        até {zone.maxMinutes} min
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle className="h-3 w-3" /> Ativa
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(zone, i)}
                            disabled={isPending}
                            title="Editar"
                            className="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-50 disabled:opacity-60"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(zone, i)}
                            disabled={isPending}
                            title="Remover"
                            className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 disabled:opacity-60"
                          >
                            {isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialog.open && (
        <ZoneDialog
          slug={slug}
          index={dialog.index}
          initial={dialog.initial}
          onClose={close}
        />
      )}
    </>
  );
}

function ZoneDialog({
  slug,
  index,
  initial,
  onClose,
}: {
  slug: string;
  index: number | null;
  initial: ZoneInput;
  onClose: () => void;
}) {
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood);
  const [fee, setFee] = useState(initial.fee.toString().replace(".", ","));
  const [maxMinutes, setMaxMinutes] = useState(initial.maxMinutes.toString());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function fieldClass(key: string) {
    return `w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none ${
      errors[key]
        ? "border-red-300 focus:border-red-400"
        : "border-neutral-200 focus:border-violet-400"
    }`;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const payload: ZoneInput = {
      neighborhood: neighborhood.trim(),
      fee: Number(fee.replace(",", ".")),
      maxMinutes: Number(maxMinutes),
    };

    startTransition(async () => {
      const result =
        index === null
          ? await addDeliveryZone(slug, payload)
          : await updateDeliveryZone(slug, index, payload);
      if (result.ok) {
        toast.success(index === null ? "Zona criada" : "Zona atualizada");
        onClose();
      } else {
        toast.error(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors);
      }
    });
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">
            {index === null ? "Nova zona de entrega" : "Editar zona"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Bairro / Região
            </label>
            <input
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Centro, Vila Madalena..."
              className={fieldClass("neighborhood")}
              autoFocus
            />
            {errors.neighborhood && (
              <p className="mt-1 text-xs text-red-600">{errors.neighborhood}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Taxa de entrega (R$)
              </label>
              <input
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                inputMode="decimal"
                placeholder="5,00"
                className={fieldClass("fee")}
              />
              {errors.fee && <p className="mt-1 text-xs text-red-600">{errors.fee}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Tempo máximo (min)
              </label>
              <input
                value={maxMinutes}
                onChange={(e) => setMaxMinutes(e.target.value)}
                inputMode="numeric"
                placeholder="40"
                className={fieldClass("maxMinutes")}
              />
              {errors.maxMinutes && (
                <p className="mt-1 text-xs text-red-600">{errors.maxMinutes}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
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
            {pending ? "Salvando..." : index === null ? "Criar zona" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
