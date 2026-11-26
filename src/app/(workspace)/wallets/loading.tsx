import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";

/** Same geometry as DompetView: flat net worth summary and wallet list, transfers on the side. */
export default function DompetLoading() {
  return (
    <div
      className="mx-auto grid max-w-2xl gap-8 lg:max-w-none lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-8"
      aria-busy="true"
    >
      <div className="grid gap-8">
        <div className="grid gap-3 pt-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-52" />
          <Skeleton className="h-3 w-56" />
          <div className="mt-2 grid grid-cols-3 gap-3 border-t border-line pt-3.5">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-8" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-24" />
          {[0, 1, 2].map((key) => (
            <SkeletonRow key={key} />
          ))}
        </div>
      </div>
      <div className="lg:border-l lg:border-line lg:pl-8">
        <Skeleton className="mb-2 h-4 w-32" />
        {[0, 1].map((key) => (
          <SkeletonRow key={key} />
        ))}
      </div>
    </div>
  );
}
