export interface OrdersPeriod {
  from: Date | undefined;
  to: Date | undefined;
  label: string;
}

export function resolveOrdersPeriod(periodParam: string | undefined, fallback = "30d"): OrdersPeriod {
  const value = periodParam ?? fallback;
  const now = new Date();
  const start = new Date(now);

  if (value === "all") {
    return { from: undefined, to: undefined, label: "Tudo" };
  }

  if (value === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (value === "7d") {
    start.setDate(start.getDate() - 7);
  } else if (value === "30d") {
    start.setDate(start.getDate() - 30);
  } else if (value === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - 30);
  }

  const labelMap: Record<string, string> = {
    today: "Hoje",
    "7d": "Últimos 7 dias",
    "30d": "Últimos 30 dias",
    month: "Este mês",
  };

  return { from: start, to: now, label: labelMap[value] ?? "Últimos 30 dias" };
}
