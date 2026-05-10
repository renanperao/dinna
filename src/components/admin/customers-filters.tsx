"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TIERS = [
  { value: "", label: "Todos" },
  { value: "vip", label: "VIP" },
  { value: "frequent", label: "Frequentes" },
  { value: "new", label: "Novos" },
];

export function CustomersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const search = searchParams.get("q") ?? "";
  const tier = searchParams.get("tier") ?? "";

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

  const hasFilters = !!search || !!tier;

  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-3", pending && "opacity-70")}>
      <div className="relative flex-1 min-w-48">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          key={search}
          type="search"
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value);
          }}
          onBlur={(e) => {
            if (e.target.value !== search) update("q", e.target.value);
          }}
          placeholder="Pesquisar por nome ou telefone..."
          className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
      </div>
      <select
        value={tier}
        onChange={(e) => update("tier", e.target.value)}
        className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
      >
        {TIERS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      {hasFilters && (
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
