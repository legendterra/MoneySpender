import { Badge } from "@/components/ui/badge";

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
      <div className="max-w-3xl space-y-3">
        <Badge>{eyebrow}</Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted md:text-base">{description}</p>
        </div>
      </div>
      {right}
    </div>
  );
}
