import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-chip bg-surface-2", className)} />;
}

/** A list row placeholder matching ListRow's geometry. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex min-h-14 items-center gap-3 py-2", className)}>
      <Skeleton className="size-10 shrink-0 rounded-control" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-3.5 w-16" />
    </div>
  );
}
