"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { navItems, isActive } from "../nav-items";
import { NavPending } from "./nav-pending";

const navLink =
  "rounded-sm text-small transition-colors hover:text-registry " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-registry/40 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

// The desktop half of the navigation: the same three destinations as the bottom
// bar, from the same source list, shown from md upwards.
export function HeaderNav({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("primary")}
      className="hidden items-center gap-6 md:flex"
    >
      {navItems(signedIn).map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              navLink +
              (active ? " text-registry font-medium" : " text-ink-secondary")
            }
          >
            {t(item.labelKey)}
            <NavPending />
          </Link>
        );
      })}
    </nav>
  );
}
