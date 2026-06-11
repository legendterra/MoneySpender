export default function WorkspaceLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded-md bg-background-elevated" />
        <div className="h-8 w-64 animate-pulse rounded-md bg-background-elevated" />
        <div className="h-4 w-96 animate-pulse rounded-md bg-background-elevated" />
      </div>

      {/* Main content skeleton */}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-lg border border-border bg-background-elevated p-8">
          <div className="h-4 w-16 animate-pulse rounded-md bg-background-strong" />
          <div className="h-10 w-80 animate-pulse rounded-md bg-background-strong" />
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded-md bg-background-strong" />
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-background-strong" />
          </div>
          <div className="flex gap-3">
            <div className="h-12 w-44 animate-pulse rounded-md bg-background-strong" />
            <div className="h-12 w-44 animate-pulse rounded-md bg-background-strong" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background-elevated p-5">
          <div className="h-4 w-32 animate-pulse rounded-md bg-background-strong" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="h-24 animate-pulse rounded-lg bg-background-strong" />
            <div className="h-24 animate-pulse rounded-lg bg-background-strong" />
          </div>
        </div>
      </div>

      {/* Summary strip skeleton */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-lg border border-border bg-background-elevated"
          />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="h-[400px] animate-pulse rounded-lg border border-border bg-background-elevated" />
        <div className="grid gap-4">
          <div className="h-[190px] animate-pulse rounded-lg border border-border bg-background-elevated" />
          <div className="h-[310px] animate-pulse rounded-lg border border-border bg-background-elevated" />
        </div>
      </div>
    </div>
  );
}