import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function isOpenNow(
  hours: Record<string, { open: string; close: string; closed?: boolean }>,
  now: Date = new Date(),
): { open: boolean; nextOpenHuman?: string } {
  const day = WEEKDAYS[now.getDay()];
  const today = hours[day];
  if (!today || today.closed) return { open: false };
  const [oH, oM] = today.open.split(":").map(Number);
  const [cH, cM] = today.close.split(":").map(Number);
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const openMin = oH * 60 + oM;
  let closeMin = cH * 60 + cM;
  if (closeMin <= openMin) closeMin += 24 * 60;
  return { open: currentMin >= openMin && currentMin < closeMin };
}
