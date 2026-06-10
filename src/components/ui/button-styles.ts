import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "border-accent bg-accent text-white hover:bg-accent-strong",
        secondary:
          "border-border bg-background-elevated text-foreground hover:border-muted hover:bg-background-strong",
        ghost:
          "border-transparent bg-transparent text-muted hover:bg-background-strong hover:text-foreground",
        danger:
          "border-danger bg-danger text-white hover:opacity-90",
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
