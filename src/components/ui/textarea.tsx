import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<"textarea">
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(fieldClass, "min-h-20 p-3", className)}
      {...props}
    />
  );
});
