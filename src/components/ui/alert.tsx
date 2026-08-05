import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-md border-l-2 px-4 py-3 text-small", {
  variants: {
    variant: {
      info: "bg-registry-soft border-registry text-registry",
      warning: "bg-warning-soft border-warning text-warning",
      danger: "bg-danger-soft border-danger text-danger",
    },
  },
  defaultVariants: { variant: "info" },
});

export type AlertProps = Omit<React.ComponentPropsWithoutRef<"div">, "title"> &
  VariantProps<typeof alertVariants> & { title?: string };

export function Alert({
  className,
  variant = "info",
  title,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? (
        <div className={title ? "mt-0.5" : undefined}>{children}</div>
      ) : null}
    </div>
  );
}
