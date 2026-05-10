"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Eye, EyeOff, Loader2, Pencil, Pizza, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  toggleProductAvailability,
  deleteProduct,
  type CategoryOption,
  type ProductInput,
} from "@/actions/products";
import { ProductFormDialog } from "./product-form-dialog";
import { formatBRL } from "@/lib/utils";

interface MenuProductSize {
  id: string;
  name: string;
  price: string;
}

interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  type: ProductInput["type"];
  categoryId: string | null;
  basePrice: string | null;
  isAvailable: boolean | null;
  sizes: MenuProductSize[];
}

interface MenuCategory {
  id: string;
  name: string;
  products: MenuProduct[];
}

interface Props {
  slug: string;
  categories: MenuCategory[];
  categoryOptions: CategoryOption[];
}

interface DialogState {
  open: boolean;
  product?: MenuProduct;
}

export function MenuAdminClient({ slug, categories, categoryOptions }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function openCreate() {
    setDialog({ open: true });
  }

  function openEdit(product: MenuProduct) {
    setDialog({ open: true, product });
  }

  function close() {
    setDialog({ open: false });
  }

  function handleToggle(product: MenuProduct) {
    setPendingId(product.id);
    startTransition(async () => {
      const result = await toggleProductAvailability(slug, product.id);
      setPendingId(null);
      if (result.ok)
        toast.success(product.isAvailable ? "Produto pausado" : "Produto disponibilizado");
      else toast.error(result.error);
    });
  }

  function handleDelete(product: MenuProduct) {
    if (!confirm(`Excluir "${product.name}"? Esta ação não pode ser desfeita.`)) return;
    setPendingId(product.id);
    startTransition(async () => {
      const result = await deleteProduct(slug, product.id);
      setPendingId(null);
      if (result.ok) toast.success("Produto excluído");
      else toast.error(result.error);
    });
  }

  const totalProducts = categories.reduce((s, c) => s + c.products.length, 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Catálogo</h1>
          <p className="text-sm text-neutral-500">
            {categories.length} categoria{categories.length !== 1 ? "s" : ""} · {totalProducts}{" "}
            produto{totalProducts !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
        >
          <PlusCircle className="h-3.5 w-3.5" /> Novo produto
        </button>
      </div>

      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-5 py-3">
              <h2 className="font-bold text-neutral-800">{cat.name}</h2>
              <span className="text-xs text-neutral-400">
                {cat.products.length} {cat.products.length === 1 ? "item" : "itens"}
              </span>
            </div>
            <div className="divide-y divide-neutral-50">
              {cat.products.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-neutral-400">
                  Nenhum produto nesta categoria
                </p>
              ) : (
                cat.products.map((product) => {
                  const minPrice =
                    product.sizes.length > 0
                      ? Math.min(...product.sizes.map((s) => Number(s.price)))
                      : Number(product.basePrice ?? 0);
                  const maxPrice =
                    product.sizes.length > 0
                      ? Math.max(...product.sizes.map((s) => Number(s.price)))
                      : Number(product.basePrice ?? 0);
                  const isPending = pendingId === product.id;
                  const available = product.isAvailable ?? true;

                  return (
                    <div
                      key={product.id}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-neutral-50 ${
                        !available ? "opacity-60" : ""
                      }`}
                    >
                      {product.imageUrl ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                          <Pizza className="h-6 w-6 text-neutral-300" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-neutral-900">{product.name}</p>
                        {product.description && (
                          <p className="truncate text-xs text-neutral-400">
                            {product.description}
                          </p>
                        )}
                        {product.sizes.length > 0 && (
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {product.sizes.map((s) => s.name).join(" · ")}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-neutral-900">
                          {minPrice === maxPrice
                            ? formatBRL(minPrice)
                            : `${formatBRL(minPrice)} – ${formatBRL(maxPrice)}`}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggle(product)}
                          disabled={isPending}
                          title={available ? "Pausar produto" : "Disponibilizar produto"}
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${
                            available
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                          }`}
                        >
                          {isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : available ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                          {available ? "Ativo" : "Pausado"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          disabled={isPending}
                          title="Editar"
                          className="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-50 disabled:opacity-60"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          disabled={isPending}
                          title="Excluir"
                          className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white py-20 text-neutral-400 shadow-sm">
            <Pizza className="h-12 w-12 opacity-20" />
            <p className="text-sm">Nenhuma categoria cadastrada.</p>
            <p className="text-xs">
              Cadastre categorias via banco enquanto a gestão de categorias não é finalizada.
            </p>
          </div>
        )}
      </div>

      <ProductFormDialog
        slug={slug}
        open={dialog.open}
        onClose={close}
        categories={categoryOptions}
        product={
          dialog.product
            ? {
                id: dialog.product.id,
                name: dialog.product.name,
                description: dialog.product.description,
                imageUrl: dialog.product.imageUrl,
                type: dialog.product.type,
                categoryId: dialog.product.categoryId,
                basePrice: dialog.product.basePrice,
                hasSizes: dialog.product.sizes.length > 0,
              }
            : undefined
        }
      />
    </>
  );
}
