"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { formatBRL } from "@/lib/utils";

interface CartFABProps {
  onOpen: () => void;
}

export function CartFAB({ onOpen }: CartFABProps) {
  const count = useCartStore((s) => s.totalCount());
  const subtotal = useCartStore((s) => s.subtotal());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || count === 0) return null;

  return (
    <button
      onClick={onOpen}
      className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-full bg-[var(--color-brand)] px-5 py-3.5 text-white shadow-lg transition-transform hover:scale-[1.02] sm:bottom-6"
    >
      <span className="inline-flex items-center gap-2">
        <span className="relative">
          <ShoppingBag className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[var(--color-brand)]">
            {count}
          </span>
        </span>
        <span className="text-sm font-semibold">Ver carrinho</span>
      </span>
      <span className="text-sm font-bold">{formatBRL(subtotal)}</span>
    </button>
  );
}
