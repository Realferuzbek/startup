import type { ReactNode } from "react";
import { requireUser } from "@/features/auth/session";

// Auth gate for every signed-in surface (/post, /edit, /profile, /verify,
// /admin). requireUser() redirects unauthenticated visitors to /login,
// preserving the attempted path so they return here after the magic link.
//
// This group adds no chrome — the header, footer and bottom bar come from the
// (site) layout above it, so the navigation is the same three destinations
// here as on the public feed.
export default async function GatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();
  return <>{children}</>;
}
