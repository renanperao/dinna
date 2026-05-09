"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { X, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn, formatBRL } from "@/lib/utils";
import {
  calcPizzaPrice,
  calcSimpleProductPrice,
  optionPriceForSize,
  type FlavorSelection,
  type OptionSelection,
} from "@/lib/pricing";
import type { MenuProduct } from "@/lib/queries/menu";
import type { ProductOption } from "@/lib/db/schema";
import { useCartStore } from "@/stores/cart-store";

interface ProductModalProps {
  product: MenuProduct;
  options: ProductOption[];
  /** all pizzas of the menu, for half/half flavor selection */
  pizzas: MenuProduct[];
  open: boolean;
  onClose: () => void;
}

export function ProductModal({ product, options, pizzas, open, onClose }: ProductModalProps) {
  const isPizza = product.type === "pizza";
  const sizes = product.sizes;
  const [sizeId, setSizeId] = useState<string | null>(sizes[0]?.id ?? null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [secondFlavorId, setSecondFlavorId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (open) {
      setSizeId(sizes[0]?.id ?? null);
      setSelectedOptions({});
      setSecondFlavorId(null);
      setQuantity(1);
      setNotes("");
    }
  }, [open, product.id, sizes]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const size = useMemo(() => sizes.find((s) => s.id === sizeId) ?? null, [sizes, sizeId]);

  const optionsApplicable = useMemo(
    () => options.filter((o) => !o.appliesToType || o.appliesToType === product.type),
    [options, product.type],
  );

  const optionsByGroup = useMemo(() => {
    const map = new Map<string, ProductOption[]>();
    for (const o of optionsApplicable) {
      const list = map.get(o.groupName) ?? [];
      list.push(o);
      map.set(o.groupName, list);
    }
    return map;
  }, [optionsApplicable]);

  const supportsHalfHalf = isPizza && (size?.maxFlavors ?? 1) >= 2;

  const otherPizzas = useMemo(
    () => pizzas.filter((p) => p.id !== product.id && p.sizes.length > 0),
    [pizzas, product.id],
  );

  const secondFlavor = otherPizzas.find((p) => p.id === secondFlavorId);
  const secondFlavorSize = secondFlavor?.sizes.find((s) => s.name === size?.name);

  const flavors: FlavorSelection[] = useMemo(() => {
    if (!isPizza || !size) return [];
    const list: FlavorSelection[] = [
      {
        productId: product.id,
        productName: product.name,
        sizePrice: Number(size.price),
      },
    ];
    if (secondFlavor && secondFlavorSize) {
      list.push({
        productId: secondFlavor.id,
        productName: secondFlavor.name,
        sizePrice: Number(secondFlavorSize.price),
      });
    }
    return list;
  }, [isPizza, size, product, secondFlavor, secondFlavorSize]);

  const selectedOptionList: OptionSelection[] = useMemo(() => {
    const list: OptionSelection[] = [];
    for (const [groupName, ids] of Object.entries(selectedOptions)) {
      for (const id of ids) {
        const opt = optionsApplicable.find((o) => o.id === id);
        if (!opt) continue;
        list.push({
          groupName,
          name: opt.name,
          priceDelta: optionPriceForSize(opt, size?.name ?? undefined),
        });
      }
    }
    return list;
  }, [selectedOptions, optionsApplicable, size?.name]);

  const unitPrice = useMemo(() => {
    if (isPizza) return calcPizzaPrice(flavors, selectedOptionList);
    return calcSimpleProductPrice(Number(product.basePrice ?? 0), selectedOptionList);
  }, [isPizza, flavors, selectedOptionList, product.basePrice]);

  function toggleOption(group: string, optionId: string, maxSelections: number) {
    setSelectedOptions((prev) => {
      const current = prev[group] ?? [];
      if (current.includes(optionId)) {
        return { ...prev, [group]: current.filter((id) => id !== optionId) };
      }
      if (maxSelections === 1) {
        return { ...prev, [group]: [optionId] };
      }
      if (current.length >= maxSelections) return prev;
      return { ...prev, [group]: [...current, optionId] };
    });
  }

  function handleAddToCart() {
    if (isPizza && !size) {
      toast.error("Escolha um tamanho");
      return;
    }
    addItem({
      productType: product.type,
      productId: product.id,
      displayName: isPizza
        ? secondFlavor
          ? `Pizza ${size?.name}: ${product.name} + ${secondFlavor.name}`
          : `Pizza ${size?.name} ${product.name}`
        : product.name,
      imageUrl: product.imageUrl,
      sizeName: size?.name,
      flavors: isPizza
        ? flavors.map((f) => ({
            productId: f.productId,
            productName: f.productName,
            sizePrice: f.sizePrice,
            percentage: flavors.length === 1 ? 100 : 50,
          }))
        : undefined,
      options: selectedOptionList,
      quantity,
      unitPrice,
      notes: notes.trim() || undefined,
    });
    toast.success(`${product.name} adicionada ao carrinho`);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[88vh] sm:max-w-lg sm:rounded-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow hover:bg-white"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        {product.imageUrl ? (
          <div className="relative h-44 w-full shrink-0 bg-neutral-100 sm:h-56">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 512px"
              priority
            />
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h2 className="text-xl font-bold">{product.name}</h2>
          {product.description ? (
            <p className="mt-1 text-sm text-neutral-600">{product.description}</p>
          ) : null}

          {isPizza && sizes.length > 0 ? (
            <Section title="Escolha o tamanho" required>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {sizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSizeId(s.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      sizeId === s.id
                        ? "border-[var(--color-brand)] bg-red-50"
                        : "border-neutral-200 hover:border-neutral-300",
                    )}
                  >
                    <div className="text-base font-bold">{s.name}</div>
                    <div className="text-xs text-neutral-500">
                      {s.diameterCm}cm · {s.slices} fatias
                    </div>
                    <div className="mt-1 text-sm font-semibold">{formatBRL(Number(s.price))}</div>
                    {(s.maxFlavors ?? 1) > 1 ? (
                      <div className="mt-0.5 text-[10px] text-neutral-500">
                        até {s.maxFlavors} sabores
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            </Section>
          ) : null}

          {supportsHalfHalf && otherPizzas.length > 0 ? (
            <Section title="Meio a meio (opcional)" subtitle="Escolha um segundo sabor">
              <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-neutral-200 p-2 sm:grid-cols-2">
                <button
                  onClick={() => setSecondFlavorId(null)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-left text-sm",
                    secondFlavorId === null
                      ? "bg-[var(--color-brand)] text-white"
                      : "hover:bg-neutral-100",
                  )}
                >
                  Inteira ({product.name})
                </button>
                {otherPizzas.map((p) => {
                  const sameSize = p.sizes.find((s) => s.name === size?.name);
                  if (!sameSize) return null;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSecondFlavorId(p.id)}
                      className={cn(
                        "rounded-lg px-3 py-2 text-left text-sm",
                        secondFlavorId === p.id
                          ? "bg-[var(--color-brand)] text-white"
                          : "hover:bg-neutral-100",
                      )}
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs opacity-80">{formatBRL(Number(sameSize.price))}</div>
                    </button>
                  );
                })}
              </div>
              {flavors.length > 1 ? (
                <p className="mt-2 text-xs text-neutral-500">
                  💡 Pizza meia/meia usa o maior preço entre os sabores escolhidos.
                </p>
              ) : null}
            </Section>
          ) : null}

          {[...optionsByGroup.entries()].map(([group, opts]) => {
            const maxSelections = opts[0]?.maxSelections ?? 1;
            const isRequired = opts.some((o) => o.isRequired);
            return (
              <Section
                key={group}
                title={group}
                subtitle={
                  maxSelections === 1
                    ? "Escolha 1"
                    : `Escolha até ${maxSelections}`
                }
                required={isRequired}
              >
                <div className="space-y-1">
                  {opts.map((opt) => {
                    const checked = (selectedOptions[group] ?? []).includes(opt.id);
                    const delta = optionPriceForSize(opt, size?.name ?? undefined);
                    return (
                      <label
                        key={opt.id}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors",
                          checked
                            ? "border-[var(--color-brand)] bg-red-50"
                            : "border-neutral-200 hover:border-neutral-300",
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type={maxSelections === 1 ? "radio" : "checkbox"}
                            name={group}
                            checked={checked}
                            onChange={() => toggleOption(group, opt.id, maxSelections)}
                            className="h-4 w-4 accent-[var(--color-brand)]"
                          />
                          <span className="text-sm">{opt.name}</span>
                        </span>
                        {delta > 0 ? (
                          <span className="text-sm text-neutral-600">
                            + {formatBRL(delta)}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">grátis</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </Section>
            );
          })}

          <Section title="Observações" subtitle="Algum detalhe especial?">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: sem cebola, bem assada..."
              className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              maxLength={200}
            />
          </Section>
        </div>

        <div className="flex items-center gap-3 border-t border-neutral-200 bg-white p-4">
          <div className="flex items-center rounded-full border border-neutral-300">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="inline-flex h-9 w-9 items-center justify-center text-neutral-700 hover:bg-neutral-100"
              aria-label="Diminuir"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="inline-flex h-9 w-9 items-center justify-center text-neutral-700 hover:bg-neutral-100"
              aria-label="Aumentar"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="lg"
            className="flex-1"
            onClick={handleAddToCart}
            disabled={isPizza && !size}
          >
            <span>Adicionar</span>
            <span className="font-bold">{formatBRL(unitPrice * quantity)}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  required,
  children,
}: {
  title: string;
  subtitle?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
            {title}
            {required ? <span className="ml-1 text-[var(--color-brand)]">*</span> : null}
          </h3>
          {subtitle ? <p className="text-xs text-neutral-500">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
