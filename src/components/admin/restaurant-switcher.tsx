"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, CheckCircle2, Store } from "lucide-react";
import type { RestaurantBrief } from "@/lib/queries/restaurants";

interface Props {
  restaurants: RestaurantBrief[];
  currentSlug: string;
}

const EMOJI: Record<string, string> = {
  "dinna-pizza": "🍕",
  "flash-pizza": "⚡",
  "dom-pizza": "👑",
};

function Avatar({ restaurant }: { restaurant: RestaurantBrief }) {
  if (restaurant.logoUrl) {
    return (
      <img
        src={restaurant.logoUrl}
        alt={restaurant.name}
        className="h-8 w-8 shrink-0 rounded-lg object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white"
      style={{ backgroundColor: restaurant.primaryColor ?? "#7C3AED" }}
    >
      {EMOJI[restaurant.slug] ?? restaurant.name[0]}
    </div>
  );
}

export function RestaurantSwitcher({ restaurants, currentSlug }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const current = restaurants.find((r) => r.slug === currentSlug) ?? restaurants[0];

  // Build the equivalent path for a different restaurant
  function switchTo(slug: string) {
    // Replace current slug in pathname
    return pathname.replace(`/admin/${currentSlug}`, `/admin/${slug}`)
                   .replace(`/kitchen/${currentSlug}`, `/kitchen/${slug}`);
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
      >
        {current ? <Avatar restaurant={current} /> : <div className="h-8 w-8 rounded-lg bg-neutral-200" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-neutral-900">
            {current?.name ?? "Selecionar"}
          </p>
          <p className="text-[10px] text-neutral-400">Portal do Parceiro</p>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Suas pizzarias
          </p>
          {restaurants.map((r) => {
            const isCurrent = r.slug === currentSlug;
            return (
              <Link
                key={r.id}
                href={switchTo(r.slug)}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-neutral-50 ${isCurrent ? "bg-violet-50" : ""}`}
              >
                <Avatar restaurant={r} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-semibold ${isCurrent ? "text-violet-700" : "text-neutral-900"}`}>
                    {EMOJI[r.slug] ?? "🍕"} {r.name}
                  </p>
                  <p className="text-xs text-neutral-400">/{r.slug}</p>
                </div>
                {isCurrent && <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-500" />}
              </Link>
            );
          })}
          <div className="border-t border-neutral-100 px-3 py-2">
            <Link
              href="#"
              className="flex items-center gap-2 text-xs font-semibold text-violet-600 hover:underline"
            >
              <Store className="h-3.5 w-3.5" />
              Adicionar restaurante
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
