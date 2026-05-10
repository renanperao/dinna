import { Skeleton, TableRowSkeleton } from "@/components/admin/skeleton";

export default function ProductsLoading() {
  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-56" />
      </div>

      <Skeleton className="mb-4 h-12 w-full" />

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRowSkeleton key={i} cols={6} />
        ))}
      </div>
    </div>
  );
}
