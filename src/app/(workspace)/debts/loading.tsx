import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";

/** Same geometry as HutangView: underline tabs + flat summary, then the list. */
export default function HutangLoading() {
  return (
    <div
      className="mx-auto grid max-w-2xl gap-8 lg:max-w-none lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start lg:gap-8"
      aria-busy="true"
    >
      <div className="grid gap-5 lg:col-start-2 lg:row-start-1 lg:border-l lg:border-line lg:pl-8">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-3 pt-1">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-3 w-52" />
          <Skeleton className="mt-2 h-2 w-full rounded-full" />
        </div>
      </div>
      <div className="lg:col-start-1 lg:row-start-1">
        <Skeleton className="mb-2 h-4 w-28" />
        {[0, 1, 2].map((key) => (
          <SkeletonRow key={key} />
        ))}
      </div>
    </div>
  );
}
