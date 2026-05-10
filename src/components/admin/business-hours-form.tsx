"use client";

import { useState, useTransition } from "react";
import { Clock, Loader2, Save, Copy } from "lucide-react";
import { toast } from "sonner";
import { updateBusinessHours, type BusinessHoursInput } from "@/actions/update-restaurant";

const DAYS = [
  { key: "mon", label: "Segunda" },
  { key: "tue", label: "Terça" },
  { key: "wed", label: "Quarta" },
  { key: "thu", label: "Quinta" },
  { key: "fri", label: "Sexta" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

interface DayState {
  open: string;
  close: string;
  closed: boolean;
}

interface BusinessHoursFormProps {
  slug: string;
  initial: Partial<Record<DayKey, { open?: string; close?: string; closed?: boolean }>> | null;
}

const DEFAULT_OPEN = "18:00";
const DEFAULT_CLOSE = "23:30";

function makeInitial(
  initial: BusinessHoursFormProps["initial"],
): Record<DayKey, DayState> {
  const result = {} as Record<DayKey, DayState>;
  for (const { key } of DAYS) {
    const cur = initial?.[key];
    result[key] = {
      open: cur?.open || DEFAULT_OPEN,
      close: cur?.close || DEFAULT_CLOSE,
      closed: !!cur?.closed,
    };
  }
  return result;
}

function maskTime(value: string): string {
  // Keep only digits, format as HH:MM as user types
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function BusinessHoursForm({ slug, initial }: BusinessHoursFormProps) {
  const [days, setDays] = useState<Record<DayKey, DayState>>(() => makeInitial(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function update(key: DayKey, patch: Partial<DayState>) {
    setDays((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function applyToAll(source: DayKey) {
    const src = days[source];
    setDays((prev) => {
      const next = { ...prev };
      for (const { key } of DAYS) {
        next[key] = { ...src };
      }
      return next;
    });
    toast.success("Horário aplicado a todos os dias");
  }

  function applyToWeekdays(source: DayKey) {
    const src = days[source];
    setDays((prev) => {
      const next = { ...prev };
      for (const key of ["mon", "tue", "wed", "thu", "fri"] as DayKey[]) {
        next[key] = { ...src };
      }
      return next;
    });
    toast.success("Horário aplicado a seg–sex");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const payload = {} as BusinessHoursInput;
    let hasError = false;

    for (const { key } of DAYS) {
      const d = days[key];
      if (d.closed) {
        payload[key] = { closed: true };
      } else {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.open)) {
          setErrors((prev) => ({ ...prev, [`${key}.open`]: "Use HH:MM" }));
          hasError = true;
          continue;
        }
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.close)) {
          setErrors((prev) => ({ ...prev, [`${key}.close`]: "Use HH:MM" }));
          hasError = true;
          continue;
        }
        payload[key] = { closed: false, open: d.open, close: d.close };
      }
    }

    if (hasError) {
      toast.error("Corrija os horários inválidos");
      return;
    }

    startTransition(async () => {
      const result = await updateBusinessHours(slug, payload);
      if (result.ok) {
        toast.success("Horários atualizados");
      } else {
        toast.error(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Clock className="h-4 w-4 text-violet-600" />
        <h2 className="font-bold text-neutral-900">Horários de funcionamento</h2>
      </div>

      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const day = days[key];
          const openErr = errors[`${key}.open`];
          const closeErr = errors[`${key}.close`];
          return (
            <div
              key={key}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-100 px-4 py-3"
            >
              <span className="w-24 shrink-0 text-sm font-semibold text-neutral-700">
                {label}
              </span>

              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={!day.closed}
                  onChange={(e) => update(key, { closed: !e.target.checked })}
                  className="h-4 w-4 cursor-pointer accent-violet-600"
                />
                <span className={day.closed ? "text-neutral-400" : "text-neutral-700"}>
                  {day.closed ? "Fechado" : "Aberto"}
                </span>
              </label>

              {!day.closed && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      value={day.open}
                      onChange={(e) => update(key, { open: maskTime(e.target.value) })}
                      placeholder="18:00"
                      maxLength={5}
                      inputMode="numeric"
                      className={`w-20 rounded-lg border px-2 py-1.5 text-center font-mono text-xs focus:outline-none ${
                        openErr
                          ? "border-red-300 focus:border-red-400"
                          : "border-neutral-200 focus:border-violet-400"
                      }`}
                    />
                    <span className="text-xs text-neutral-400">até</span>
                    <input
                      value={day.close}
                      onChange={(e) => update(key, { close: maskTime(e.target.value) })}
                      placeholder="23:30"
                      maxLength={5}
                      inputMode="numeric"
                      className={`w-20 rounded-lg border px-2 py-1.5 text-center font-mono text-xs focus:outline-none ${
                        closeErr
                          ? "border-red-300 focus:border-red-400"
                          : "border-neutral-200 focus:border-violet-400"
                      }`}
                    />
                  </div>

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyToWeekdays(key)}
                      title="Copiar para seg–sex"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-neutral-500 hover:bg-neutral-50"
                    >
                      <Copy className="h-3 w-3" /> seg–sex
                    </button>
                    <button
                      type="button"
                      onClick={() => applyToAll(key)}
                      title="Copiar para todos"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-neutral-500 hover:bg-neutral-50"
                    >
                      <Copy className="h-3 w-3" /> todos
                    </button>
                  </div>
                </>
              )}

              {(openErr || closeErr) && (
                <span className="basis-full text-xs text-red-600">
                  {openErr || closeErr}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {pending ? "Salvando..." : "Salvar horários"}
        </button>
      </div>
    </form>
  );
}
