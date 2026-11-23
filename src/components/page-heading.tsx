/** Legacy page intro used by screens that are not rebuilt yet. The shell owns the <h1>. */
export function PageHeading({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow: string;
  title: string;
  description: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 max-w-3xl space-y-2">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">{eyebrow}</p>
        <h2 className="text-2xl font-bold tracking-tight text-text md:text-[28px]">{title}</h2>
        <p className="max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {right}
    </div>
  );
}
