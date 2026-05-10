"use client";

import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatBRL } from "@/lib/utils";

export interface AbcDatum {
  productName: string;
  revenue: number;
  cumulativePct: number;
  classification: "A" | "B" | "C";
}

const CLASS_COLOR: Record<"A" | "B" | "C", string> = {
  A: "#10b981",
  B: "#f59e0b",
  C: "#94a3b8",
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: AbcDatum }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-0.5 font-semibold text-neutral-900">{d.productName}</p>
      <p className="text-neutral-700">
        Faturamento: <span className="font-semibold">{formatBRL(d.revenue)}</span>
      </p>
      <p className="text-neutral-700">
        Acumulado: <span className="font-semibold">{d.cumulativePct.toFixed(1)}%</span>
      </p>
      <p className="mt-1">
        <span
          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
          style={{
            background: CLASS_COLOR[d.classification] + "33",
            color: CLASS_COLOR[d.classification],
          }}
        >
          Classe {d.classification}
        </span>
      </p>
    </div>
  );
}

export function AbcCurveChart({ data, height = 280 }: { data: AbcDatum[]; height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#f1f1f3" vertical={false} />
          <XAxis dataKey="productName" hide />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#737373" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
            width={50}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "#737373" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
            width={36}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#7c3aed", fillOpacity: 0.06 }} />
          <ReferenceLine
            yAxisId="right"
            y={80}
            stroke="#10b981"
            strokeDasharray="3 3"
            label={{ value: "80%", fontSize: 10, fill: "#10b981", position: "right" }}
          />
          <ReferenceLine
            yAxisId="right"
            y={95}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{ value: "95%", fontSize: 10, fill: "#f59e0b", position: "right" }}
          />
          <Bar yAxisId="left" dataKey="revenue" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={CLASS_COLOR[d.classification]} />
            ))}
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativePct"
            stroke="#7c3aed"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
