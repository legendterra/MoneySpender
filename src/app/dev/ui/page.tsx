import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UiGallery } from "./gallery";

export const metadata: Metadata = { title: "UI gallery", robots: { index: false } };

/** Visual QA gallery. Only available when NEXT_PUBLIC_UI_GALLERY=1 (see PLAN.md section 3). */
export default function UiGalleryPage() {
  if (process.env.NEXT_PUBLIC_UI_GALLERY !== "1") notFound();
  return <UiGallery />;
}
