"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ComponentPropsWithoutRef } from "react";

type Props = Omit<ComponentPropsWithoutRef<typeof Button>, "type" | "loading">;

// Submit button for a form driven by a plain server action, where the parent is
// a server component and cannot hold useActionState. useFormStatus reads the
// enclosing form's pending state, so the button reports progress and refuses a
// double submit without the parent becoming a client component.
export function SubmitButton(props: Props) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending} {...props} />;
}
