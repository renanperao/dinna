"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";

export interface DeliveryZone {
  neighborhood: string;
  fee: number;
  maxMinutes: number;
}

const zoneSchema = z.object({
  neighborhood: z.string().min(1, "Bairro obrigatório").max(100),
  fee: z.number().min(0, "Taxa não pode ser negativa").max(1000),
  maxMinutes: z.number().int().min(1, "Tempo deve ser ao menos 1 min").max(600),
});

export type ZoneInput = z.infer<typeof zoneSchema>;

export type ZoneResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function loadZones(slug: string): Promise<{ id: string; zones: DeliveryZone[] } | null> {
  const rows = await db
    .select({ id: restaurants.id, deliveryZones: restaurants.deliveryZones })
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    zones: (rows[0].deliveryZones ?? []) as DeliveryZone[],
  };
}

async function saveZones(restaurantId: string, zones: DeliveryZone[]) {
  await db
    .update(restaurants)
    .set({ deliveryZones: zones, updatedAt: new Date() })
    .where(eq(restaurants.id, restaurantId));
}

function normalize(name: string) {
  return name.trim().toLowerCase();
}

export async function addDeliveryZone(slug: string, raw: ZoneInput): Promise<ZoneResult> {
  const parsed = zoneSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, error: "Dados inválidos", fieldErrors };
  }

  const data = parsed.data;
  const restaurant = await loadZones(slug);
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado" };

  if (restaurant.zones.some((z) => normalize(z.neighborhood) === normalize(data.neighborhood))) {
    return {
      ok: false,
      error: "Já existe uma zona com esse bairro",
      fieldErrors: { neighborhood: "Bairro já cadastrado" },
    };
  }

  await saveZones(restaurant.id, [...restaurant.zones, data]);
  revalidatePath(`/admin/${slug}/delivery`);
  revalidatePath(`/${slug}`);
  return { ok: true };
}

export async function updateDeliveryZone(
  slug: string,
  index: number,
  raw: ZoneInput,
): Promise<ZoneResult> {
  const parsed = zoneSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, error: "Dados inválidos", fieldErrors };
  }

  const restaurant = await loadZones(slug);
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado" };
  if (index < 0 || index >= restaurant.zones.length) {
    return { ok: false, error: "Zona não encontrada" };
  }

  if (
    restaurant.zones.some(
      (z, i) => i !== index && normalize(z.neighborhood) === normalize(parsed.data.neighborhood),
    )
  ) {
    return {
      ok: false,
      error: "Já existe outra zona com esse bairro",
      fieldErrors: { neighborhood: "Bairro já cadastrado" },
    };
  }

  const next = [...restaurant.zones];
  next[index] = parsed.data;
  await saveZones(restaurant.id, next);
  revalidatePath(`/admin/${slug}/delivery`);
  revalidatePath(`/${slug}`);
  return { ok: true };
}

export async function deleteDeliveryZone(slug: string, index: number): Promise<ZoneResult> {
  const restaurant = await loadZones(slug);
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado" };
  if (index < 0 || index >= restaurant.zones.length) {
    return { ok: false, error: "Zona não encontrada" };
  }

  const next = restaurant.zones.filter((_, i) => i !== index);
  await saveZones(restaurant.id, next);
  revalidatePath(`/admin/${slug}/delivery`);
  revalidatePath(`/${slug}`);
  return { ok: true };
}
