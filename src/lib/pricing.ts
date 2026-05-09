import type { ProductSize, ProductOption } from "@/lib/db/schema";

export interface FlavorSelection {
  productId: string;
  productName: string;
  sizePrice: number;
}

export interface OptionSelection {
  groupName: string;
  name: string;
  priceDelta: number;
}

/**
 * Pizza meio-a-meio: usa o maior preço entre os sabores escolhidos (regra brasileira padrão).
 * Para 1 sabor inteiro = retorna o preço do tamanho.
 */
export function calcPizzaPrice(
  flavors: FlavorSelection[],
  options: OptionSelection[] = [],
): number {
  if (flavors.length === 0) return 0;
  const base = Math.max(...flavors.map((f) => f.sizePrice));
  const optionsTotal = options.reduce((sum, o) => sum + (o.priceDelta || 0), 0);
  return Number((base + optionsTotal).toFixed(2));
}

export function calcSimpleProductPrice(
  basePrice: number,
  options: OptionSelection[] = [],
): number {
  const optionsTotal = options.reduce((sum, o) => sum + (o.priceDelta || 0), 0);
  return Number((basePrice + optionsTotal).toFixed(2));
}

export function priceFromSize(
  size: Pick<ProductSize, "price">,
): number {
  return Number(size.price);
}

export function optionPriceForSize(
  option: Pick<ProductOption, "priceDelta" | "priceBySize">,
  sizeName?: string,
): number {
  if (option.priceBySize && sizeName && option.priceBySize[sizeName] !== undefined) {
    return Number(option.priceBySize[sizeName]);
  }
  return Number(option.priceDelta ?? 0);
}

export function minSizePrice(sizes: Array<Pick<ProductSize, "price">>): number {
  if (!sizes.length) return 0;
  return Math.min(...sizes.map((s) => Number(s.price)));
}
