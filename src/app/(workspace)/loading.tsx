export default function WorkspaceLoading() {
  return (
    <div className="grid gap-4">
      <div className="h-40 animate-pulse rounded-lg border border-border bg-background-elevated" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-lg border border-border bg-background-elevated"
          />
        ))}
      </div>
    </div>
  );
}
