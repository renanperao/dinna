"use client";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface HeatmapProps {
  matrix: number[][]; // [dow][hour]
  maxValue: number;
}

function intensity(value: number, max: number): string {
  if (value === 0) return "bg-neutral-100";
  if (max === 0) return "bg-neutral-100";
  const pct = value / max;
  if (pct < 0.15) return "bg-violet-100";
  if (pct < 0.3) return "bg-violet-200";
  if (pct < 0.5) return "bg-violet-300";
  if (pct < 0.7) return "bg-violet-500";
  if (pct < 0.85) return "bg-violet-600";
  return "bg-violet-700";
}

export function Heatmap({ matrix, maxValue }: HeatmapProps) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex items-end gap-1 pl-10">
          {Array.from({ length: 24 }).map((_, h) => (
            <div
              key={h}
              className="w-6 shrink-0 text-center text-[10px] text-neutral-400"
              style={{ visibility: h % 3 === 0 ? "visible" : "hidden" }}
            >
              {String(h).padStart(2, "0")}h
            </div>
          ))}
        </div>

        <div className="mt-1 space-y-1">
          {DAYS.map((dayLabel, dow) => (
            <div key={dayLabel} className="flex items-center gap-1">
              <span className="w-9 shrink-0 text-right text-xs font-semibold text-neutral-500">
                {dayLabel}
              </span>
              {Array.from({ length: 24 }).map((_, hour) => {
                const value = matrix[dow]?.[hour] ?? 0;
                return (
                  <div
                    key={hour}
                    title={`${dayLabel} ${String(hour).padStart(2, "0")}h: ${value} pedido${
                      value !== 1 ? "s" : ""
                    }`}
                    className={`h-6 w-6 shrink-0 rounded-sm ${intensity(value, maxValue)} transition-colors hover:ring-2 hover:ring-violet-400`}
                  >
                    {value > 0 ? (
                      <span className="sr-only">
                        {dayLabel} {hour}h: {value}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-2 pl-10 text-[10px] text-neutral-500">
          <span>menos</span>
          <div className="flex gap-1">
            <div className="h-3 w-3 rounded-sm bg-neutral-100" />
            <div className="h-3 w-3 rounded-sm bg-violet-100" />
            <div className="h-3 w-3 rounded-sm bg-violet-300" />
            <div className="h-3 w-3 rounded-sm bg-violet-500" />
            <div className="h-3 w-3 rounded-sm bg-violet-700" />
          </div>
          <span>mais</span>
          <span className="ml-auto font-semibold text-neutral-700">
            Pico: {maxValue} pedido{maxValue !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
