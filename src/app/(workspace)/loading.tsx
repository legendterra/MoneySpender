import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";

export default function WorkspaceLoading() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6 lg:max-w-none" aria-busy="true">
      <div className="grid gap-3 rounded-sheet border border-line bg-surface p-5 md:p-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div>
        <Skeleton className="mb-2 h-4 w-24" />
        {[0, 1, 2, 3].map((key) => (
          <SkeletonRow key={key} />
        ))}
      </div>
    </div>
  );
}
