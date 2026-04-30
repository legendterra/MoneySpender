import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "button-shine inline-flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-success/30 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "border-white/45 bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white shadow-[0_18px_48px_rgba(57,74,216,0.32)] hover:-translate-y-0.5 hover:shadow-[0_24px_64px_rgba(57,74,216,0.38)]",
        secondary:
          "border-[rgba(108,120,158,0.26)] bg-white/30 text-foreground shadow-[0_10px_28px_rgba(54,74,155,0.08)] hover:border-white/80 hover:bg-white/48 dark:bg-white/8 dark:hover:bg-white/12",
        ghost:
          "border-transparent bg-transparent text-muted hover:bg-white/30 hover:text-foreground dark:hover:bg-white/10",
        danger:
          "border-white/35 bg-danger text-white shadow-[0_18px_48px_rgba(255,111,145,0.24)]",
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
