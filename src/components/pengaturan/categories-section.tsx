"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ConfirmSheet } from "@/components/pengaturan/confirm-sheet";
import { SettingsSection, writeError } from "@/components/pengaturan/section";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { LinkTabs, TextChoice } from "@/components/flat/controls";
import { Sheet } from "@/components/ui/sheet";
import { isTempId, tempId } from "@/lib/list-change";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Category, TransactionType } from "@/lib/types";
import { useSyncedList } from "@/lib/use-synced-list";

const DEFAULT_COLORS: Record<TransactionType, string> = { expense: "#ff7a6b", income: "#3dd68c" };
const byName = (a: Category, b: Category) => a.name.localeCompare(b.name, "id");

type Editing = { category: Category | null; session: number; open: boolean };

export function CategoriesSection({
  userId,
  type,
  items,
  page,
  totalPages,
  totalItems,
}: {
  userId: string;
  type: TransactionType;
  items: Category[];
  page: number;
  totalPages: number;
  totalItems: number;
}) {
  const t = useTranslations("pengaturan");
  const router = useRouter();
  const { list, mutate } = useSyncedList(items, byName);
  const [editing, setEditing] = React.useState<Editing>({ category: null, session: 0, open: false });
  const [confirmDelete, setConfirmDelete] = React.useState<Category | null>(null);

  function open(category: Category | null) {
    setEditing((current) => ({ category, open: true, session: current.session + 1 }));
  }

  async function save(name: string, nextType: TransactionType) {
    const supabase = createBrowserSupabaseClient();
    const current = editing.category;
    setEditing((state) => ({ ...state, open: false }));

    if (current) {
      const error = await mutate({ type: "upsert", item: { ...current, name } }, async () => {
        const { error: updateError } = await supabase
          .from("categories")
          .update({ name })
          .eq("id", current.id)
          .eq("user_id", userId);
        if (!updateError) return {};
        return {
          error:
            updateError.code === "23505"
              ? t("categoryDuplicate", { name })
              : writeError("update", "categories.name", updateError),
        };
      });
      if (error) toast.error(t("saveFailed"), { description: error });
      else toast.success(t("categoryRenamed"));
      return;
    }

    const draft: Category = { id: tempId(), name, type: nextType, color: DEFAULT_COLORS[nextType] };
    const insert = async () => {
      const { data, error: insertError } = await supabase
        .from("categories")
        .insert({ user_id: userId, name, type: nextType, color: draft.color })
        .select("id,name,type,color")
        .single();
      if (insertError) {
        return {
          error:
            insertError.code === "23505"
              ? t("categoryDuplicate", { name })
              : writeError("insert", "categories", insertError),
        };
      }
      return { item: data as Category };
    };

    if (nextType !== type) {
      // Created for the other list: save, then show that list.
      const result = await insert();
      if (result.error) {
        toast.error(t("saveFailed"), { description: result.error });
        return;
      }
      toast.success(t("categoryAdded", { name }));
      router.push(`/settings/kategori${nextType === "income" ? "?type=income" : ""}`);
      return;
    }
    const error = await mutate({ type: "upsert", item: draft }, insert);
    if (error) toast.error(t("saveFailed"), { description: error });
    else toast.success(t("categoryAdded", { name }));
  }

  async function remove(category: Category) {
    setConfirmDelete(null);
    setEditing((state) => ({ ...state, open: false }));
    const error = await mutate({ type: "remove", id: category.id }, async () => {
      const { error: deleteError } = await createBrowserSupabaseClient()
        .from("categories")
        .delete()
        .eq("id", category.id)
        .eq("user_id", userId);
      return deleteError ? { error: writeError("delete", "categories", deleteError) } : {};
    });
    if (error) toast.error(t("deleteFailedGeneric"), { description: error });
    else toast.success(t("categoryDeleted", { name: category.name }));
  }

  return (
    <SettingsSection
      id="kategori"
      title={t("categoriesTitle")}
      description={t("categoriesBody")}
      action={
        <Button size="sm" variant="secondary" onClick={() => open(null)}>
          <Plus aria-hidden="true" />
          {t("add")}
        </Button>
      }
    >
      <LinkTabs
        label={t("categoryType")}
        value={type}
        items={[
          { value: "expense", label: t("typeExpense"), href: "/settings/kategori" },
          { value: "income", label: t("typeIncome"), href: "/settings/kategori?type=income" },
        ]}
      />
      {list.length ? (
        <ul className="mt-2 divide-y divide-line border-b border-line" data-testid="category-list">
          {list.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => open(category)}
                disabled={isTempId(category.id)}
                className="flex min-h-[52px] w-full items-center gap-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
                aria-label={t("editCategory", { name: category.name })}
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: category.color ?? DEFAULT_COLORS[category.type] }}
                />
                <span className="min-w-0 flex-1 truncate text-[14px] text-text">{category.name}</span>
                <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-[13px] text-muted">{t("categoriesEmpty")}</p>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        pathname="/settings/kategori"
        query={{ type: type === "income" ? "income" : undefined }}
      />
      <p className="mt-2 text-center text-[12px] text-muted">{t("listCount", { count: totalItems })}</p>

      <CategorySheet
        key={editing.session}
        state={editing}
        defaultType={type}
        onOpenChange={(next) => setEditing((current) => ({ ...current, open: next }))}
        onSave={(name, nextType) => void save(name, nextType)}
        onDelete={(category) => setConfirmDelete(category)}
      />
      <ConfirmSheet
        open={confirmDelete !== null}
        onOpenChange={(next) => {
          if (!next) setConfirmDelete(null);
        }}
        title={t("deleteCategoryTitle", { name: confirmDelete?.name ?? "" })}
        body={<p>{t("deleteCategoryBody")}</p>}
        confirmLabel={t("delete")}
        onConfirm={() => {
          if (confirmDelete) void remove(confirmDelete);
        }}
      />
    </SettingsSection>
  );
}

function CategorySheet({
  state,
  defaultType,
  onOpenChange,
  onSave,
  onDelete,
}: {
  state: Editing;
  defaultType: TransactionType;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, type: TransactionType) => void;
  onDelete: (category: Category) => void;
}) {
  const t = useTranslations("pengaturan");
  const editing = state.category;
  const [name, setName] = React.useState(editing?.name ?? "");
  const [type, setType] = React.useState<TransactionType>(editing?.type ?? defaultType);
  const [error, setError] = React.useState<string | null>(null);

  function submit(event?: React.FormEvent) {
    event?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("categoryNameRequired"));
      return;
    }
    if (editing && trimmed === editing.name) {
      onOpenChange(false);
      return;
    }
    onSave(trimmed, type);
  }

  return (
    <Sheet
      open={state.open}
      onOpenChange={onOpenChange}
      title={editing ? t("editCategoryTitle") : t("newCategoryTitle")}
      size="sm"
      footer={
        <div className="flex gap-2">
          {editing ? (
            <Button variant="danger" onClick={() => onDelete(editing)}>
              {t("delete")}
            </Button>
          ) : null}
          <Button className="flex-1" onClick={() => submit()}>
            {t("save")}
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="grid gap-4 pt-1">
        {!editing ? (
          <TextChoice
            label={t("categoryType")}
            value={type}
            onChange={setType}
            options={[
              { value: "expense", label: t("typeExpense"), tone: "expense" },
              { value: "income", label: t("typeIncome"), tone: "income" },
            ]}
          />
        ) : null}
        <Field label={t("categoryName")} error={error ?? undefined}>
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            maxLength={40}
            placeholder={t("categoryPlaceholder")}
            aria-invalid={Boolean(error) || undefined}
          />
        </Field>
        {editing ? <p className="text-[12px] text-muted">{t("categoryRenameHint")}</p> : null}
      </form>
    </Sheet>
  );
}
