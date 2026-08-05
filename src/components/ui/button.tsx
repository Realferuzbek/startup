import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  // Base: 40px visual (md), tight radius, 15px medium. The `after:` layer is a
  // transparent 44px touch target over the visual height (accessibility floor).
  "relative inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap " +
    "transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-registry/40 " +
    "disabled:cursor-not-allowed disabled:opacity-60 " +
    "after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']",
  {
    variants: {
      variant: {
        primary: "bg-registry text-surface hover:bg-registry/90",
        secondary:
          "border border-rule-strong bg-transparent text-ink hover:border-ink-muted",
        ghost:
          "bg-transparent text-ink-secondary hover:bg-registry-soft hover:text-registry",
        destructive:
          "border border-danger bg-transparent text-danger hover:bg-danger-soft",
      },
      size: {
        md: "h-10 px-4 text-button",
        sm: "h-9 px-3 text-small",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    /**
     * Never disable a button silently. Pass a reason and it is exposed via
     * title/aria — the button is only visually disabled when it says why.
     */
    disabledReason?: string;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      loading = false,
      disabledReason,
      disabled,
      type = "button",
      children,
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || Boolean(disabledReason) || loading;
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        title={disabledReason}
        {...props}
      >
        {loading ? (
          <svg
            viewBox="0 0 16 16"
            className="size-4 animate-spin"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="6" className="opacity-25" />
            <path d="M8 2 a6 6 0 0 1 6 6" strokeLinecap="round" />
          </svg>
        ) : null}
        {children}
      </button>
    );
  },
);
