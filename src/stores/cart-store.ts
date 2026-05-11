"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartFlavor {
  productId: string;
  productName: string;
  sizePrice: number;
  percentage: number;
}

export interface CartOption {
  groupName: string;
  name: string;
  priceDelta: number;
}

export interface CartItem {
  /** generated client-side, used as key for editing/removing */
  id: string;
  productType: "pizza" | "beverage" | "side" | "dessert" | "combo" | "other";
  productId: string;
  displayName: string;
  imageUrl?: string | null;
  sizeName?: string;
  flavors?: CartFlavor[];
  options: CartOption[];
  quantity: number;
  unitPrice: number;
  notes?: string;
}

interface CartState {
  restaurantSlug: string | null;
  items: CartItem[];
  setRestaurantSlug: (slug: string) => void;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  totalCount: () => number;
  subtotal: () => number;
}

let counter = 0;
const newId = () => {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}`;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantSlug: null,
      items: [],

      setRestaurantSlug: (slug) => {
        const current = get().restaurantSlug;
        if (current && current !== slug) {
          set({ restaurantSlug: slug, items: [] });
        } else {
          set({ restaurantSlug: slug });
        }
      },

      addItem: (item) => {
        set({ items: [...get().items, { ...item, id: newId() }] });
      },

      removeItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.id !== id) });
          return;
        }
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        });
      },

      clear: () => set({ items: [] }),

      totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () =>
        Number(
          get()
            .items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
            .toFixed(2),
        ),
    }),
    {
      name: "nexomenu-cart",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : (undefined as never),
      ),
    },
  ),
);
