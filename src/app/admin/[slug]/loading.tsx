import { ChartCardSkeleton, Skeleton, StatCardSkeleton } from "@/components/admin/skeleton";

export default function DashboardLoading() {
  return (
    <div className="px-5 py-6 sm:px-8">
      <div className="mb-6">
        <Skeleton className="mb-2 h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <ChartCardSkeleton className="lg:col-span-2" />
        <ChartCardSkeleton />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <Skeleton className="mb-4 h-5 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-neutral-50 py-3 last:border-0">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
