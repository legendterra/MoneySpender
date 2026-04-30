import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "button-shine inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-success/30 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
        secondary:
          "border-border bg-background-elevated text-foreground shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:bg-background-strong",
        ghost:
          "border-transparent bg-transparent text-muted hover:bg-background-strong hover:text-foreground",
        danger:
          "border-transparent bg-danger text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
      },
      size: {
        sm: "min-h-10 px-3.5 py-2 text-xs",
        md: "min-h-12 px-4 py-3",
        lg: "min-h-14 px-5 py-3.5 text-base",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
);
