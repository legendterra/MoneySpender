import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "button-shine inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-accent text-white shadow-[0_18px_48px_rgba(57,112,242,0.32)] hover:bg-accent-strong",
        secondary:
          "border-border bg-background-elevated text-foreground hover:border-accent/35 hover:bg-background-strong",
        ghost:
          "border-transparent bg-transparent text-muted hover:bg-accent-soft hover:text-foreground",
        danger:
          "border-transparent bg-danger text-white shadow-[0_18px_48px_rgba(229,90,125,0.24)]",
      },
      size: {
        sm: "min-h-10 px-3 py-2 text-xs",
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
