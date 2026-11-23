import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border font-semibold transition-[background-color,border-color,color,transform] duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border-primary-edge/50 bg-primary text-on-primary hover:brightness-[1.04] dark:border-primary",
        secondary:
          "border-line bg-surface-2 text-text hover:border-line-strong",
        ghost:
          "border-transparent bg-transparent text-muted hover:bg-surface-2 hover:text-text",
        danger:
          "border-expense/30 bg-expense-soft text-expense hover:border-expense/60",
        outline:
          "border-line-strong bg-transparent text-text hover:bg-surface-2",
      },
      size: {
        sm: "min-h-11 px-3.5 text-[13px]",
        md: "min-h-12 px-4 text-sm",
        lg: "min-h-14 px-5 text-[15px]",
        icon: "size-11 p-0",
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
