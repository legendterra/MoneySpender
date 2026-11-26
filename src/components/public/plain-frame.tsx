import Link from "next/link";

import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const widths = { sm: "max-w-[420px]", md: "max-w-2xl", lg: "max-w-[1040px]" } as const;

/**
 * Frame for screens outside the app shell (auth, onboarding, install guide,
 * offline, 404): logo, optional actions, theme toggle, safe-area aware.
 */
export function PlainFrame({
  children,
  width = "sm",
  center = false,
  actions,
  logoHref = "/dashboard",
  className,
}: {
  children: React.ReactNode;
  width?: keyof typeof widths;
  /** Vertically center the content (short screens such as login and 404). */
  center?: boolean;
  actions?: React.ReactNode;
  logoHref?: string | null;
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="mx-auto flex h-16 w-full max-w-[1040px] items-center gap-2 px-4 md:px-6">
        {logoHref ? (
          <Link
            href={logoHref}
            className="-ml-1 rounded-chip px-1 py-1 outline-none focus-visible:outline-2 focus-visible:outline-ring"
          >
            <LogoMark />
          </Link>
        ) : (
          <LogoMark />
        )}
        <div className="ml-auto flex items-center gap-1">
          {actions}
          <ThemeToggle />
        </div>
      </header>
      <main
        id="main"
        className={cn(
          "mx-auto flex w-full flex-1 flex-col px-4 pb-10 md:px-6",
          widths[width],
          center && "justify-center",
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}
