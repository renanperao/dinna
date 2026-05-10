"use client";

import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

export function ExportCsvButton({ slug }: { slug: string }) {
  const searchParams = useSearchParams();

  const params = new URLSearchParams(searchParams);
  params.set("slug", slug);
  const href = `/api/export/orders?${params.toString()}`;

  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
    >
      <Download className="h-3.5 w-3.5" /> Exportar CSV
    </a>
  );
}
