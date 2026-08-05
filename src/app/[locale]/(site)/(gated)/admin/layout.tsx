import type { ReactNode } from "react";
import { requireRole } from "@/features/auth/session";

// The admin gate. Composes over the (app) layout's requireUser: a signed-in
// non-admin is redirected to /not-authorized (never 404), an anonymous visitor
// to /login. RLS remains the final authority behind every admin read/write.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("admin");
  return <>{children}</>;
}
