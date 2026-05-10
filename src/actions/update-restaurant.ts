"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const dayHoursSchema = z.union([
  z.object({ closed: z.literal(true), open: z.string().optional(), close: z.string().optional() }),
  z.object({
    closed: z.literal(false).optional(),
    open: z.string().regex(HHMM, "Use formato HH:MM"),
    close: z.string().regex(HHMM, "Use formato HH:MM"),
  }),
]);

const businessHoursSchema = z.object({
  mon: dayHoursSchema,
  tue: dayHoursSchema,
  wed: dayHoursSchema,
  thu: dayHoursSchema,
  fri: dayHoursSchema,
  sat: dayHoursSchema,
  sun: dayHoursSchema,
});

export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;

const settingsSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  phone: z.string().min(8),
  whatsapp: z.string().min(8),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida (use formato #RRGGBB)"),
  address: z.object({
    street: z.string().min(1, "Rua obrigatória"),
    number: z.string().optional().or(z.literal("")),
    neighborhood: z.string().min(1, "Bairro obrigatório"),
    city: z.string().min(1, "Cidade obrigatória"),
    state: z.string().min(2).max(2),
    cep: z.string().optional().or(z.literal("")),
  }),
});

export type UpdateRestaurantInput = z.infer<typeof settingsSchema>;

export type UpdateRestaurantResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export async function updateRestaurant(
  input: UpdateRestaurantInput,
): Promise<UpdateRestaurantResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { ok: false, error: "Dados inválidos", fieldErrors };
  }

  const data = parsed.data;
  const existing = await db
    .select({ id: restaurants.id, address: restaurants.address })
    .from(restaurants)
    .where(eq(restaurants.slug, data.slug))
    .limit(1);

  if (!existing[0]) {
    return { ok: false, error: "Restaurante não encontrado" };
  }

  const previousAddress = existing[0].address;

  await db
    .update(restaurants)
    .set({
      name: data.name,
      description: data.description || null,
      phone: digitsOnly(data.phone),
      whatsapp: digitsOnly(data.whatsapp),
      primaryColor: data.primaryColor,
      address: {
        ...(previousAddress ?? {}),
        street: data.address.street,
        number: data.address.number || "",
        neighborhood: data.address.neighborhood,
        city: data.address.city,
        state: data.address.state.toUpperCase(),
        cep: data.address.cep || "",
      },
      updatedAt: new Date(),
    })
    .where(eq(restaurants.id, existing[0].id));

  revalidatePath(`/admin/${data.slug}`, "layout");
  revalidatePath(`/${data.slug}`);

  return { ok: true };
}

export async function updateBusinessHours(
  slug: string,
  input: BusinessHoursInput,
): Promise<UpdateRestaurantResult> {
  const parsed = businessHoursSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { ok: false, error: "Horários inválidos", fieldErrors };
  }

  const existing = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);
  if (!existing[0]) return { ok: false, error: "Restaurante não encontrado" };

  type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  const normalized = {} as Record<DayKey, { open: string; close: string; closed?: boolean }>;
  for (const [day, value] of Object.entries(parsed.data)) {
    if (value.closed) {
      normalized[day as DayKey] = { open: "", close: "", closed: true };
    } else {
      normalized[day as DayKey] = { open: value.open!, close: value.close! };
    }
  }

  await db
    .update(restaurants)
    .set({ businessHours: normalized, updatedAt: new Date() })
    .where(eq(restaurants.id, existing[0].id));

  revalidatePath(`/admin/${slug}`, "layout");
  revalidatePath(`/${slug}`);
  return { ok: true };
}
