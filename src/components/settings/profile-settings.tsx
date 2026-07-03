"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { ProfileData } from "@/lib/types";

const profileSchema = z.object({
  fullName: z.string().min(2, "Nama minimal 2 karakter"),
  currencyCode: z.string().length(3, "Mata uang 3 huruf"),
  monthlyGoal: z.number().min(0),
  yearlyGoal: z.number().min(0),
});

type ProfileValues = z.infer<typeof profileSchema>;

export function ProfileSettings({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.full_name ?? "",
      currencyCode: profile.currency_code ?? "IDR",
      monthlyGoal: Number(profile.monthly_savings_goal ?? 0),
      yearlyGoal: Number(profile.yearly_savings_goal ?? 0),
    },
  });

  async function onSubmit(values: ProfileValues) {
    setIsSaving(true);
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sesi login berakhir.");
      setIsSaving(false);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        full_name: values.fullName,
      },
    });

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: values.fullName,
      currency_code: values.currencyCode.toUpperCase(),
      monthly_savings_goal: values.monthlyGoal,
      yearly_savings_goal: values.yearlyGoal,
    });

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Profil dan target berhasil diperbarui.");
    router.refresh();
  }

  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Profil</p>
        <h2 className="text-2xl font-bold text-foreground">Nama, mata uang, dan target</h2>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
        <Field label="Nama" error={form.formState.errors.fullName?.message}>
          <Input {...form.register("fullName")} />
        </Field>
        <Field label="Mata uang" hint="Dipakai untuk semua tampilan nominal">
          <Select {...form.register("currencyCode")}>
            {SUPPORTED_CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Target nabung bulanan">
          <Input
            type="number"
            min="0"
            step="1"
            {...form.register("monthlyGoal", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Target nabung tahunan">
          <Input
            type="number"
            min="0"
            step="1"
            {...form.register("yearlyGoal", { valueAsNumber: true })}
          />
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" isLoading={isSaving}>
            Simpan profil
          </Button>
        </div>
      </form>
    </Panel>
  );
}
