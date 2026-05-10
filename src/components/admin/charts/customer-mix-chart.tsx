"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface CustomerMixDatum {
  label: string;
  newCustomers: number;
  recurring: number;
}

interface CustomerMixChartProps {
  data: CustomerMixDatum[];
  height?: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + p.value, 0);
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-neutral-900">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-neutral-600">
            {p.dataKey === "newCustomers" ? "Novos" : "Recorrentes"}:
          </span>
          <span className="font-semibold text-neutral-900">{p.value}</span>
        </p>
      ))}
      <p className="mt-1 border-t border-neutral-100 pt-1 text-neutral-500">Total: {total}</p>
    </div>
  );
}

export function CustomerMixChart({ data, height = 240 }: CustomerMixChartProps) {
  const tickEvery = data.length > 14 ? Math.ceil(data.length / 7) : 1;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#f1f1f3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#737373" }}
            tickLine={false}
            axisLine={false}
            interval={tickEvery - 1}
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
            cursor={{ fill: "#7c3aed", fillOpacity: 0.06 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(v) => (v === "newCustomers" ? "Novos" : "Recorrentes")}
          />
          <Bar dataKey="recurring" stackId="c" fill="#7c3aed" radius={[0, 0, 0, 0]} />
          <Bar dataKey="newCustomers" stackId="c" fill="#34d399" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
