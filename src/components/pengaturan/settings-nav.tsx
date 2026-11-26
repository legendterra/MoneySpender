"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { SETTINGS_SECTIONS, type SettingsSlug } from "@/components/pengaturan/settings-sections";
import { cn } from "@/lib/utils";

function activeSlug(pathname: string): SettingsSlug | null {
  if (pathname === "/settings") return "profil";
  const match = /^\/settings\/([a-z]+)/.exec(pathname);
  return (match?.[1] as SettingsSlug | undefined) ?? null;
}

/** Desktop (>= 1024px) left sub-nav; text links with a text-color + marker active state. */
export function SettingsSubnav() {
  const t = useTranslations("pengaturan");
  const pathname = usePathname();
  const active = activeSlug(pathname);

  return (
    <nav aria-label={t("sectionsNav")} className="hidden lg:block">
      <ul className="sticky top-24 grid gap-0.5">
        {SETTINGS_SECTIONS.map((section) => {
          const current = section.slug === active;
          return (
            <li key={section.slug}>
              <Link
                href={section.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative flex min-h-10 items-center pl-4 text-[14px] outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  "before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:rounded-full before:content-['']",
                  current
                    ? "font-semibold text-text before:bg-primary-ink"
                    : "font-medium text-muted before:bg-transparent hover:text-text",
                )}
              >
                {t(section.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
