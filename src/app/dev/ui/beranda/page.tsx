import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { BerandaSkeleton, BerandaView } from "@/components/beranda/beranda-view";

import {
  fixtureBeranda,
  fixtureBerandaEmpty,
  fixtureBerandaOver,
  fixtureBerandaPast,
  fixtureCatatData,
  fixtureUser,
} from "../fixtures";

export const metadata: Metadata = { title: "Beranda (gallery)", robots: { index: false } };

const states = {
  default: fixtureBeranda,
  over: fixtureBerandaOver,
  empty: fixtureBerandaEmpty,
  past: fixtureBerandaPast,
} as const;

/** Full Beranda screen inside the real app shell, with fixture data. ?state=over|empty|past|loading */
export default async function GalleryBerandaPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.NEXT_PUBLIC_UI_GALLERY !== "1") notFound();
  const { state } = await searchParams;

  return (
    <AppShell
      demo
      demoPathname="/dashboard"
      userLabel={fixtureUser.label}
      userEmail={fixtureUser.email}
      catatData={fixtureCatatData}
    >
      {state === "loading" ? (
        <BerandaSkeleton />
      ) : (
        <BerandaView {...(states[state as keyof typeof states] ?? fixtureBeranda)} />
      )}
    </AppShell>
  );
}
