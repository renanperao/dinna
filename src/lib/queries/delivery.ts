import type { Restaurant } from "@/lib/db/schema";

export interface DeliveryZone {
  neighborhood: string;
  fee: number;
  maxMinutes: number;
}

export function getDeliveryFeeForNeighborhood(
  restaurant: Restaurant,
  neighborhood: string,
): { fee: number; maxMinutes: number } | null {
  const zones = restaurant.deliveryZones as DeliveryZone[] | null;
  if (!zones || zones.length === 0) return null;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const match = zones.find((z) => norm(z.neighborhood) === norm(neighborhood));
  return match ? { fee: match.fee, maxMinutes: match.maxMinutes } : null;
}

export function getMinDeliveryFee(restaurant: Restaurant): number {
  const zones = restaurant.deliveryZones as DeliveryZone[] | null;
  if (!zones || zones.length === 0) return 0;
  return Math.min(...zones.map((z) => z.fee));
}

export interface CepResponse {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function fetchCep(cep: string): Promise<CepResponse | null> {
  try {
    const clean = cep.replace(/\D/g, "");
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, { cache: "force-cache" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return data as CepResponse;
  } catch {
    return null;
  }
}
