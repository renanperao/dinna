"use client";

import { useState, useTransition } from "react";
import { Loader2, X, Info } from "lucide-react";
import { toast } from "sonner";
import {
  createProduct,
  updateProduct,
  type ProductInput,
  type CategoryOption,
} from "@/actions/products";

const TYPES = [
  { value: "pizza" as const, label: "Pizza" },
  { value: "beverage" as const, label: "Bebida" },
  { value: "side" as const, label: "Acompanhamento" },
  { value: "dessert" as const, label: "Sobremesa" },
  { value: "combo" as const, label: "Combo" },
  { value: "other" as const, label: "Outro" },
];

interface ExistingProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  type: ProductInput["type"];
  categoryId: string | null;
  basePrice: string | null;
  hasSizes: boolean;
}

interface Props {
  slug: string;
  open: boolean;
  onClose: () => void;
  categories: CategoryOption[];
  /** When provided, dialog is in edit mode. */
  product?: ExistingProduct;
}

export function ProductFormDialog({ slug, open, onClose, categories, product }: Props) {
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [type, setType] = useState<ProductInput["type"]>(product?.type ?? "beverage");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [basePrice, setBasePrice] = useState(
    product?.basePrice ? Number(product.basePrice).toFixed(2).replace(".", ",") : "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function close() {
    if (!isEdit) {
      setName("");
      setDescription("");
      setImageUrl("");
      setType("beverage");
      setCategoryId("");
      setBasePrice("");
    }
    setErrors({});
    onClose();
  }

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

    const numericPrice = Number(basePrice.replace(",", "."));
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setErrors({ basePrice: "Preço inválido" });
      return;
    }

    const payload: ProductInput = {
      name: name.trim(),
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
      type,
      categoryId: categoryId || null,
      basePrice: numericPrice,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateProduct(slug, { id: product!.id, ...payload })
        : await createProduct(slug, payload);
      if (result.ok) {
        toast.success(isEdit ? "Produto atualizado" : "Produto criado");
        close();
      } else {
        toast.error(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors);
      }
    });
  }

  if (!open) return null;

  const typeLocked = isEdit; // don't allow changing type on existing product
  const showPizzaSizesInfo = !isEdit && type === "pizza";
  const editingPizzaWithSizes = isEdit && product?.hasSizes;

  return (
    <div
      onClick={close}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">
            {isEdit ? "Editar produto" : "Novo produto"}
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Nome
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Margherita"
              className={fieldClass("name")}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProductInput["type"])}
                disabled={typeLocked}
                className={`${fieldClass("type")} disabled:cursor-not-allowed disabled:bg-neutral-50`}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Categoria
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={fieldClass("categoryId")}
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Molho de tomate San Marzano, mussarela, manjericão..."
              className={`${fieldClass("description")} resize-none`}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              URL da imagem (opcional)
            </label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className={fieldClass("imageUrl")}
            />
            {errors.imageUrl && <p className="mt-1 text-xs text-red-600">{errors.imageUrl}</p>}
          </div>

          {!editingPizzaWithSizes && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {type === "pizza" ? "Preço base (tamanho P)" : "Preço (R$)"}
              </label>
              <input
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                inputMode="decimal"
                placeholder={type === "pizza" ? "39,90" : "12,90"}
                className={fieldClass("basePrice")}
              />
              {errors.basePrice && (
                <p className="mt-1 text-xs text-red-600">{errors.basePrice}</p>
              )}
            </div>
          )}

          {showPizzaSizesInfo && (
            <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Tamanhos serão criados automaticamente: <strong>P</strong> (preço base),{" "}
                <strong>M</strong> (+R$12), <strong>G</strong> (+R$24), <strong>GG</strong>{" "}
                (+R$38). Ajuste depois conforme necessário.
              </span>
            </div>
          )}

          {editingPizzaWithSizes && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Esta pizza tem tamanhos cadastrados. Edição de preços por tamanho será adicionada
                em breve.
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
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
            {pending ? "Salvando..." : isEdit ? "Salvar" : "Criar produto"}
          </button>
        </div>
      </form>
    </div>
  );
}
