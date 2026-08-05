"use client";

import { useLinkStatus } from "next/link";

// Immediate feedback that a click registered, before the next route arrives.
//
// useLinkStatus() takes no arguments and returns { pending: boolean }. It reads
// LinkStatusContext, which next/link provides around its <a>, so this component
// MUST be rendered as a child of a <Link>. next-intl's Link renders next/link
// internally, so it works through that wrapper unchanged.
//
// The dot is always in the layout and only its opacity changes — an element that
// appears on click would shift the label sideways. When the route is already
// prefetched the pending phase is skipped, which is correct: there is nothing to
// indicate if the navigation is instant.
export function NavPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      data-pending={pending || undefined}
      className="nav-pending"
    />
  );
}
