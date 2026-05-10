"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface HourlyDatum {
  hour: number;
  count: number;
}

interface HourlyChartProps {
  data: HourlyDatum[];
  height?: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HourlyDatum }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-0.5 font-semibold text-neutral-900">
        {String(d.hour).padStart(2, "0")}:00 — {String((d.hour + 1) % 24).padStart(2, "0")}:00
      </p>
      <p className="font-bold text-violet-600">
        {d.count} pedido{d.count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function HourlyChart({ data, height = 200 }: HourlyChartProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#f1f1f3" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: "#737373" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(h) => `${String(h).padStart(2, "0")}h`}
            interval={2}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#737373" }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "#7c3aed", fillOpacity: 0.08 }}
          />
          <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
