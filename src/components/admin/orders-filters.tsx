"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "awaiting_payment", label: "Aguardando pagamento" },
  { value: "received", label: "Recebido" },
  { value: "preparing", label: "Preparando" },
  { value: "ready", label: "Pronto" },
  { value: "out_for_delivery", label: "Em entrega" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
];

const METHODS = [
  { value: "pix", label: "PIX" },
  { value: "credit", label: "Crédito" },
  { value: "debit", label: "Débito" },
  { value: "cash", label: "Dinheiro" },
  { value: "on_delivery_card", label: "Cartão/Entrega" },
  { value: "on_delivery_cash", label: "Dinheiro/Entrega" },
];

const TYPES = [
  { value: "delivery", label: "Delivery" },
  { value: "pickup", label: "Retirada" },
  { value: "dine_in", label: "Mesa" },
];

const PERIODS = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Este mês" },
  { value: "all", label: "Tudo" },
];

interface OrdersFiltersProps {
  showStatus?: boolean;
  showType?: boolean;
  showMethod?: boolean;
  showPeriod?: boolean;
  defaultPeriod?: string;
}

export function OrdersFilters({
  showStatus = true,
  showType = false,
  showMethod = true,
  showPeriod = true,
  defaultPeriod = "30d",
}: OrdersFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const status = searchParams.get("status") ?? "";
  const method = searchParams.get("method") ?? "";
  const type = searchParams.get("type") ?? "";
  const period = searchParams.get("period") ?? defaultPeriod;
  const search = searchParams.get("q") ?? "";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (!value) params.delete(key);
    else params.set(key, value);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function clearAll() {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  const hasActiveFilters =
    !!status || !!method || !!type || !!search || (period && period !== defaultPeriod);

  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-2", pending && "opacity-70")}>
      <div className="relative min-w-48 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          // key forces remount when URL changes externally (clear button etc.)
          key={search}
          type="search"
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value);
          }}
          onBlur={(e) => {
            if (e.target.value !== search) update("q", e.target.value);
          }}
          placeholder="Buscar por cliente, telefone ou número"
          className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-violet-400 focus:outline-none"
        />
      </div>

      {showStatus && (
        <select
          value={status}
          onChange={(e) => update("status", e.target.value)}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
        >
          <option value="">Todos os status</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      {showMethod && (
        <select
          value={method}
          onChange={(e) => update("method", e.target.value)}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
        >
          <option value="">Todas as formas</option>
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      )}

      {showType && (
        <select
          value={type}
          onChange={(e) => update("type", e.target.value)}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
        >
          <option value="">Todos os tipos</option>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      )}

      {showPeriod && (
        <select
          value={period}
          onChange={(e) => update("period", e.target.value)}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
        >
          <X className="h-3.5 w-3.5" /> Limpar
        </button>
      )}
    </div>
  );
}

