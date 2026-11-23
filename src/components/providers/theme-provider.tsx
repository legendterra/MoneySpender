"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Dark first; users can switch to light (or system) and the choice is remembered. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
