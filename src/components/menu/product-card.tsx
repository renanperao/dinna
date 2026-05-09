"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { MenuProduct } from "@/lib/queries/menu";
import { minSizePrice } from "@/lib/pricing";

interface ProductCardProps {
  product: MenuProduct;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const startingPrice =
    product.type === "pizza" && product.sizes.length
      ? minSizePrice(product.sizes)
      : Number(product.basePrice ?? 0);

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md sm:gap-4 sm:p-4"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold text-neutral-900">{product.name}</h3>
          {product.isFeatured ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
              Destaque
            </span>
          ) : null}
        </div>
        {product.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{product.description}</p>
        ) : null}

        {product.tags && product.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-600"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-2 flex items-baseline gap-1">
          {product.type === "pizza" ? (
            <span className="text-xs text-neutral-500">a partir de</span>
          ) : null}
          <span className="text-base font-bold text-neutral-900">
            {formatBRL(startingPrice)}
          </span>
        </div>
      </div>

      {product.imageUrl ? (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100 sm:h-24 sm:w-24">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 80px, 96px"
          />
          <span className="absolute bottom-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand)] text-white shadow">
            <Plus className="h-4 w-4" />
          </span>
        </div>
      ) : (
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-white">
          <Plus className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}
