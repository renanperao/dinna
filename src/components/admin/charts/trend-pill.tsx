import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendPillProps {
  current: number;
  previous: number;
  inverse?: boolean;
  suffix?: string;
}

export function TrendPill({ current, previous, inverse = false, suffix = "vs período anterior" }: TrendPillProps) {
  if (previous === 0 && current === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
        <Minus className="h-3 w-3" /> sem dados {suffix}
      </span>
    );
  }

  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
        <ArrowUpRight className="h-3 w-3" /> novo {suffix}
      </span>
    );
  }

  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const positive = inverse ? pct < 0 : pct > 0;
  const flat = Math.abs(pct) < 0.5;

  if (flat) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
        <Minus className="h-3 w-3" /> estável {suffix}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        positive ? "text-emerald-600" : "text-red-600",
      )}
    >
      {pct > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}% {suffix}
    </span>
  );
}
