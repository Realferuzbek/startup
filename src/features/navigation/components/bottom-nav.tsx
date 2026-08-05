"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { navItems, isActive, type NavKey } from "../nav-items";
import { NavPending } from "./nav-pending";

// Icons are hand-inlined SVG, as everywhere else in this project — 1.5px
// stroke, currentColor, no fill, no icon dependency pulled into the interior.
const ICONS: Record<NavKey, ReactNode> = {
  feed: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" />,
  post: <path d="M12 8v8M8 12h8M4.5 4.5h15v15h-15z" />,
  profile: (
    <path d="M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5a7.5 7.5 0 0 1 15 0" />
  ),
};

// Fixed bottom navigation, below the md breakpoint only. Hairline top border,
// never a shadow. The bar is fixed, so it takes no space in flow — the site
// layout reserves the equivalent height as bottom padding instead.
export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = navItems(signedIn);

  return (
    <nav
      aria-label={t("primary")}
      className="border-rule bg-paper fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {items.map((item) => {
          const active = isActive(item, pathname);
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "relative flex h-14 flex-col items-center justify-center gap-1 " +
                  "transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] " +
                  "focus-visible:ring-2 focus-visible:ring-registry/40 focus-visible:outline-none " +
                  (active ? "text-registry" : "text-ink-secondary")
                }
              >
                {/* The active item is marked by a rule as well as by colour —
                    meaning is never carried by colour alone. */}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="bg-registry absolute inset-x-0 top-0 h-0.5"
                  />
                ) : null}
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {ICONS[item.key]}
                </svg>
                <span className="text-caption text-center leading-none">
                  {t(item.labelKey)}
                  <NavPending />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
