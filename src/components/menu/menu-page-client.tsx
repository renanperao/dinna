"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "./product-card";
import { ProductModal } from "./product-modal";
import { CategoryNav } from "./category-nav";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartFAB } from "@/components/cart/cart-fab";
import { CheckoutModal } from "@/components/checkout/checkout-modal";
import { useCartStore } from "@/stores/cart-store";
import type { MenuCategory, MenuProduct } from "@/lib/queries/menu";
import type { ProductOption, Restaurant } from "@/lib/db/schema";

interface MenuPageClientProps {
  restaurant: Restaurant;
  categories: MenuCategory[];
  options: ProductOption[];
}

export function MenuPageClient({ restaurant, categories, options }: MenuPageClientProps) {
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [search, setSearch] = useState("");

  const setRestaurantSlug = useCartStore((s) => s.setRestaurantSlug);
  useEffect(() => {
    setRestaurantSlug(restaurant.slug);
  }, [restaurant.slug, setRestaurantSlug]);

  const allPizzas = useMemo(
    () =>
      categories
        .flatMap((c) => c.products)
        .filter((p) => p.type === "pizza" && p.sizes.length > 0),
    [categories],
  );

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories
      .map((c) => ({
        ...c,
        products: c.products.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.description?.toLowerCase().includes(term) ||
            p.ingredients?.some((i) => i.toLowerCase().includes(term)),
        ),
      }))
      .filter((c) => c.products.length > 0);
  }, [categories, search]);

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pizza, bebida, ingrediente..."
            className="w-full rounded-full border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[var(--color-brand)] focus:outline-none"
          />
        </div>

        <CategoryNav
          categories={filteredCategories.map((c) => ({ id: c.id, name: c.name }))}
        />

        <div className="mt-4 space-y-8">
          {filteredCategories.map((cat) => (
            <section key={cat.id} id={cat.id} className="scroll-mt-20">
              <h2 className="mb-3 text-xl font-bold text-neutral-900">{cat.name}</h2>
              <div className="grid grid-cols-1 gap-3">
                {cat.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => setSelectedProduct(product)}
                  />
                ))}
              </div>
            </section>
          ))}
          {filteredCategories.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-500">
              Nenhum item encontrado para "{search}".
            </p>
          ) : null}
        </div>
      </div>

      {selectedProduct ? (
        <ProductModal
          product={selectedProduct}
          options={options}
          pizzas={allPizzas}
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}

      <CartFAB onOpen={() => setCartOpen(true)} />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
        minOrderValue={Number(restaurant.minOrderValue ?? 0)}
      />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        restaurant={restaurant}
      />
    </>
  );
}
