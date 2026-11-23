import { Skeleton } from "@/components/ui/skeleton";

/** Flat loading state: heading, description and divider rows (same geometry as the screens). */
export function FlatListSkeleton({ rows = 6, hero = false }: { rows?: number; hero?: boolean }) {
  return (
    <div className="grid max-w-2xl gap-5" aria-busy="true">
      {hero ? (
        <div className="grid gap-2.5 pb-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-52" />
          <Skeleton className="h-3 w-64" />
          <Skeleton className="mt-2 h-2 w-full rounded-full" />
        </div>
      ) : (
        <div className="grid gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
      )}
      <div className="divide-y divide-line border-y border-line">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex min-h-[60px] items-center gap-3 py-3">
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
