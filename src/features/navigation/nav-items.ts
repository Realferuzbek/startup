// The three destinations, defined once and shared by the desktop header and the
// mobile bottom bar so the two can never drift apart. There is nothing else in
// the navigation: no browse link, no dashboard, no saved, no admin. Admins
// navigate to /admin directly — it stays role-gated, it just isn't advertised.
export type NavKey = "feed" | "post" | "profile";

export type NavItem = {
  key: NavKey;
  /** Locale-less href for `@/i18n/navigation`'s Link/usePathname. */
  href: string;
  /** Key inside the `nav` message namespace. */
  labelKey: string;
};

const FEED: NavItem = { key: "feed", href: "/", labelKey: "feed" };
const POST: NavItem = { key: "post", href: "/post", labelKey: "post" };

// Signed out, the third destination is the way in rather than the way to your
// own things — same slot, same icon, different label and target.
const PROFILE: NavItem = {
  key: "profile",
  href: "/profile",
  labelKey: "profile",
};
const SIGN_IN: NavItem = {
  key: "profile",
  href: "/login",
  labelKey: "signIn",
};

export function navItems(signedIn: boolean): NavItem[] {
  return [FEED, POST, signedIn ? PROFILE : SIGN_IN];
}

// Active-state test. `pathname` comes from `usePathname()` in
// @/i18n/navigation, which strips the locale prefix, so "/" really is the feed.
// The post and profile entries stay lit across their sub-routes.
export function isActive(item: NavItem, pathname: string): boolean {
  if (item.key === "feed") return pathname === "/";
  if (item.key === "post") return pathname.startsWith("/post");
  return pathname.startsWith("/profile") || pathname.startsWith("/login");
}
