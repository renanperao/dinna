"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/utils";

export interface RevenueDatum {
  label: string;
  revenue: number;
  count: number;
}

interface RevenueChartProps {
  data: RevenueDatum[];
  height?: number;
  color?: string;
}

function compactBRL(value: number): string {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return `R$ ${value.toFixed(0)}`;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RevenueDatum }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-0.5 font-semibold text-neutral-900">{d.label}</p>
      <p className="font-bold text-violet-600">{formatBRL(d.revenue)}</p>
      <p className="text-neutral-500">{d.count} pedido{d.count !== 1 ? "s" : ""}</p>
    </div>
  );
}

export function RevenueChart({ data, height = 240, color = "#7c3aed" }: RevenueChartProps) {
  const tickEvery = data.length > 14 ? Math.ceil(data.length / 7) : 1;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f1f1f3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#737373" }}
            tickLine={false}
            axisLine={false}
            interval={tickEvery - 1}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#737373" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={compactBRL}
            width={60}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: color, strokeOpacity: 0.2, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={color}
            strokeWidth={2}
            fill="url(#revenue-gradient)"
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
