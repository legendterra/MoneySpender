import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";

/** Same geometry as RiwayatView: search, filter chips, two day groups. */
export default function RiwayatLoading() {
  return (
    <div
      className="mx-auto grid max-w-2xl gap-5 lg:max-w-none lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-6"
      aria-busy="true"
    >
      <div className="grid gap-4">
        <Skeleton className="h-12 w-full rounded-chip" />
        <div className="flex gap-2 overflow-hidden">
          {["w-16", "w-16", "w-20", "w-[72px]", "w-[120px]", "w-32"].map((width, index) => (
            <Skeleton key={index} className={`h-9 shrink-0 rounded-chip ${width}`} />
          ))}
        </div>
        <div className="grid gap-6">
          {[3, 2].map((rows, group) => (
            <div key={group}>
              <Skeleton className="mb-2 h-4 w-28" />
              {Array.from({ length: rows }, (_, key) => (
                <SkeletonRow key={key} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="hidden gap-3 lg:grid lg:border-l lg:border-line lg:pl-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-3.5 w-full" />
        <Skeleton className="h-3.5 w-full" />
      </div>
    </div>
  );
}
