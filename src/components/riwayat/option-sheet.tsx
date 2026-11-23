"use client";

import * as React from "react";
import { Check, Search } from "lucide-react";

import { inputClassName } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type PickerOption = {
  value: string | null;
  label: string;
  hint?: string;
  /** Options with the same group are listed under one heading. */
  group?: string;
};

/** Single-choice list in a small sheet (wallet, category and period filters). */
export function OptionSheet({
  open,
  onOpenChange,
  title,
  options,
  value,
  onSelect,
  searchLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: PickerOption[];
  value: string | null;
  onSelect: (value: string | null) => void;
  /** Shows a search field above long lists. */
  searchLabel?: string;
}) {
  const [query, setQuery] = React.useState("");
  const lower = query.trim().toLocaleLowerCase("id");
  const visible = lower
    ? options.filter((option) => option.value === null || option.label.toLocaleLowerCase("id").includes(lower))
    : options;

  const groups: Array<{ name: string | null; items: PickerOption[] }> = [];
  for (const option of visible) {
    const name = option.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(option);
    else groups.push({ name, items: [option] });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
      title={title}
      size="sm"
    >
      <div className="grid gap-3">
        {searchLabel ? (
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={searchLabel}
              placeholder={searchLabel}
              className={cn(inputClassName, "min-h-11 pl-9")}
            />
          </div>
        ) : null}
        <div role="radiogroup" aria-label={title} className="grid gap-3">
          {groups.map((group, index) => (
            <div key={`${group.name ?? "none"}-${index}`} className="grid gap-0.5">
              {group.name ? (
                <p className="px-2.5 pt-1 pb-1 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
                  {group.name}
                </p>
              ) : null}
              {group.items.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value ?? "all"}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      onSelect(option.value);
                      setQuery("");
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-chip px-2.5 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring",
                      selected && "bg-primary-soft",
                    )}
                  >
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate text-[14px] font-medium text-text">{option.label}</span>
                      {option.hint ? <span className="truncate text-[12px] text-muted">{option.hint}</span> : null}
                    </span>
                    {selected ? <Check className="size-[18px] shrink-0 text-primary-ink" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
