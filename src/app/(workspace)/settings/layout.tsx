import { SettingsSubnav } from "@/components/pengaturan/settings-nav";

/** Mobile: menu or one section per route. Desktop: sub-nav left, the selected section right. */
export default function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto max-w-2xl lg:grid lg:max-w-none lg:grid-cols-[12rem_minmax(0,40rem)] lg:gap-14">
      <SettingsSubnav />
      <div className="min-w-0 pt-2 lg:pt-1">{children}</div>
    </div>
  );
}
