"use client";

import { useEffect } from "react";
import { Minus, Plus, Trash2, X, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/utils";
import { useCartStore, type CartItem } from "@/stores/cart-store";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  minOrderValue?: number;
}

export function CartDrawer({ open, onClose, minOrderValue = 0 }: CartDrawerProps) {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore((s) => s.subtotal());

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const meetsMin = subtotal >= minOrderValue;
  const remaining = Math.max(0, minOrderValue - subtotal);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag className="h-5 w-5" />
            Seu carrinho
          </h2>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-neutral-500">
            <ShoppingBag className="h-12 w-12 text-neutral-300" />
            <p className="mt-3 text-sm">Seu carrinho está vazio.</p>
            <p className="text-xs">Escolha sua pizza no cardápio.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ul className="divide-y divide-neutral-200">
              {items.map((item) => (
                <CartLine
                  key={item.id}
                  item={item}
                  onIncrement={() => updateQuantity(item.id, item.quantity + 1)}
                  onDecrement={() => updateQuantity(item.id, item.quantity - 1)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </ul>
          </div>
        )}

        <footer className="border-t border-neutral-200 bg-white p-4">
          {minOrderValue > 0 && !meetsMin && items.length > 0 ? (
            <p className="mb-3 rounded-lg bg-amber-50 p-2 text-center text-xs text-amber-800">
              Faltam <strong>{formatBRL(remaining)}</strong> para o pedido mínimo de{" "}
              {formatBRL(minOrderValue)}.
            </p>
          ) : null}
          <div className="mb-3 flex items-baseline justify-between text-sm">
            <span className="text-neutral-600">Subtotal</span>
            <span className="text-lg font-bold">{formatBRL(subtotal)}</span>
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={items.length === 0 || !meetsMin}
            onClick={() => {
              // Phase 2: real checkout
              alert("Checkout será implementado na Fase 2");
            }}
          >
            Finalizar pedido
          </Button>
        </footer>
      </aside>
    </div>
  );
}

function CartLine({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  const itemTotal = item.unitPrice * item.quantity;
  return (
    <li className="flex gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight">{item.displayName}</h3>
          <button
            onClick={onRemove}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
            aria-label="Remover"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {item.options.length > 0 ? (
          <ul className="mt-1 text-xs text-neutral-500">
            {item.options.map((o, i) => (
              <li key={`${o.groupName}-${o.name}-${i}`}>
                + {o.groupName}: {o.name}
              </li>
            ))}
          </ul>
        ) : null}
        {item.notes ? <p className="mt-1 text-xs italic text-neutral-500">"{item.notes}"</p> : null}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center rounded-full border border-neutral-300">
            <button
              onClick={onDecrement}
              className="inline-flex h-7 w-7 items-center justify-center text-neutral-700 hover:bg-neutral-100"
              aria-label="Diminuir"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
            <button
              onClick={onIncrement}
              className="inline-flex h-7 w-7 items-center justify-center text-neutral-700 hover:bg-neutral-100"
              aria-label="Aumentar"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <span className="text-sm font-bold">{formatBRL(itemTotal)}</span>
        </div>
      </div>
    </li>
  );
}
