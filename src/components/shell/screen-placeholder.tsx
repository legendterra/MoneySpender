import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-styles";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

/** Temporary screen body until the real screen is built. */
export function ScreenPlaceholder({
  icon,
  title,
  body,
  legacyHref,
  legacyLabel,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  legacyHref?: string;
  legacyLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-sheet border border-line bg-surface">
      <EmptyState
        icon={icon}
        title={title}
        body={body}
        action={
          legacyHref && legacyLabel ? (
            <Link href={legacyHref} className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
              {legacyLabel}
            </Link>
          ) : undefined
        }
        className="py-14"
      />
    </div>
  );
}
