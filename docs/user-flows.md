# Makleer — user flows

This document describes the product from the outside — what a person sees and does, screen by screen. `CLAUDE.md` describes the data and security model; `.claude/skills/design-system/SKILL.md` describes the visual language. This one describes the experience, and where they conflict, the flow described here is what we build and the other two get updated to match.

Rewritten in Chunk R1, which renamed the product and removed most of its surface area.

---

## What Makleer is

> Maklers hold the real inventory in Uzbekistan, but they're invisible and unaccountable — Makleer makes them visible, rated, and accountable.

The platform **connects estate agents (maklers) with customers**. It does not try to route around them. That is the inversion at the centre of this chunk: the previous product's thesis was eliminating agents by proving ownership through the state registry, and that is no longer what we are building.

Three consequences run through everything below:

- **Anyone signed in may post.** No verification, no approval queue, no gate.
- **Browsing never requires a session.** Sign-in is required only to post or to save.
- **The home page is the feed.** There is no separate browse page and no dashboard.

### Verification is deferred, not removed

Ownership verification was the old thesis. It is now a **premium feature scheduled for a later chunk**, and in the meantime it is hidden rather than deleted:

- The `property_verifications` table, the `submit_verification` / `decide_verification` RPCs, the private `verification-documents` bucket, and every RLS policy around them are **untouched**.
- The host submission page still exists at `/[locale]/verify/[id]` and still works. Nothing links to it.
- The admin queue at `/[locale]/admin/verifications` still exists and still works.
- The only change is on the host's home card: the "Tasdiqlash" link and the rejection reason are commented out, with a note naming what to restore. A property that is already `verified` or `pending` still shows its badge, because the public listing page shows the same badge and the host's own card should not be less truthful than the public one.
- `search_listings` still ranks verified listings above unverified ones under the default sort. That is invisible today because no new property can become verified, and it will be correct on the day verification returns.

Do not delete verification code, tables, columns, or policies.

### Rent only for now

Every listing is a rental. **Sale listings are planned** and are deliberately not built yet. There is no `listing_type` column and no sale UI. Nothing in the current structure should make sale harder to add later: when it lands it will be a new discriminator on `listings` plus a filter, not a restructure.

### Drafts

A new home still saves as a **draft** and publishing is still a separate, deliberate action. **Drafts are being removed in the next chunk (R2), not this one** — the multi-step property → photos → listing → publish flow described below is what exists today and it must keep working until R2 replaces it.

---

## Core principle

**The host manages homes, not database rows.**

Underneath, a property is durable (address, coordinates, photos, ownership) and a listing is a 30-day offer against it. That separation is correct and stays. But the host never sees two objects. They see one home, with a state.

A home is in exactly one of four states:

| State   | Meaning                      | What the host sees             |
| ------- | ---------------------------- | ------------------------------ |
| Draft   | Created, not yet publishable | What's still missing           |
| Live    | Publicly visible             | Price, expiry date, view count |
| Paused  | Hidden by the host           | Resume button                  |
| Expired | 30 days elapsed              | Republish button               |

**Rule: a property may have at most one active listing at a time.** Enforced at the database. Without this, one apartment can appear twice in search results.

---

## Privacy

These rules are not negotiable and no screen below may violate them.

- `properties.address_line` and exact coordinates (`location`) are **host-private** and must NEVER reach a public page or any public API response. **Public location granularity is region + district only.** anon is column-restricted on `properties` (SELECT only `id, region_id, district_id, verification_status`), so the guarantee holds even against a hand-crafted anon API call.
- Exact coordinates are stored precisely, but on **public** listing pages they must be displayed approximately (offset/radius) — no map on public pages until that fuzzing lands.
- On the listing detail page: region and district as text. **Never the exact address, never exact coordinates.**
- On the host's own home card: the address line is shown, and only there.
- Owner identity beyond a display name is never exposed publicly (no email, no phone, no user id). The owner's phone reaches a renter **only** through the rate-limited `reveal_contact` RPC.

---

## Navigation

**Three destinations. Nothing more.** Identical on both platforms, identical signed in and signed out.

|     | Destination   | Route               | Signed out                                       |
| --- | ------------- | ------------------- | ------------------------------------------------ |
| 1   | Bosh sahifa   | `/[locale]`         | same                                             |
| 2   | Eʼlon yuklash | `/[locale]/post`    | same (the page itself asks for sign-in)          |
| 3   | Profil        | `/[locale]/profile` | labelled **Kirish**, routes to `/[locale]/login` |

**Desktop (`md` and up):** a header — wordmark on the left, the three destinations plus the locale switcher on the right.

**Mobile (below `md`):** a **fixed bottom navigation bar** with the three destinations, each an icon above a label, with a clear active state marked by colour _and_ a rule (never colour alone). The header collapses to the wordmark and the locale switcher. Page content is never obscured: the bar is `fixed`, and the site layout reserves its exact height (3.5rem plus the iOS safe-area inset) as bottom padding.

Removed from navigation entirely: Eʼlonlar, Boshqaruv paneli, Saqlanganlar, Uylarim as a separate item, and Admin. **The admin link is not rendered anywhere** — admins type `/admin`. It remains role-gated exactly as before.

---

## Routes

| Route                                                             | Purpose                                           | Auth       |
| ----------------------------------------------------------------- | ------------------------------------------------- | ---------- |
| `/[locale]`                                                       | The feed — all active listings                    | none       |
| `/[locale]/listings/[id]`                                         | Listing detail                                    | none       |
| `/[locale]/post`                                                  | Create a home (step 1 of posting)                 | required   |
| `/[locale]/post/listing`                                          | Create the rental offer (step 3)                  | required   |
| `/[locale]/edit/property/[id]`                                    | Edit a home + manage its photos (step 2)          | required   |
| `/[locale]/edit/listing/[id]`                                     | Edit a rental offer                               | required   |
| `/[locale]/profile`                                               | Profile hub                                       | required   |
| `/[locale]/verify/[id]`                                           | Ownership verification — **unlinked**             | required   |
| `/[locale]/admin`                                                 | Admin overview                                    | admin only |
| `/[locale]/admin/verifications`                                   | Verification queue — reachable, unlinked from nav | admin only |
| `/[locale]/login`, `/[locale]/not-authorized`, `/[locale]/design` | Auth, refusal, internal design preview (noindex)  | —          |

Everything that disappeared redirects rather than 404s:

- `/[locale]/listings` → `/[locale]`, **preserving every query parameter verbatim**, repeated keys included
- `/[locale]/dashboard` and **every** path beneath it → `/[locale]/profile` (one optional catch-all, so old bookmarks to `/dashboard/favorites`, `/dashboard/profile`, `/dashboard/properties/new`, `/dashboard/listings/[id]/edit`, `/dashboard/homes/[id]/verify` and the rest all land somewhere sensible)

---

## Journey 1 — Customer

### 1.1 The feed (`/uz`)

The home page **is** the listings feed. It opens directly onto houses: no hero, no trust strip, no how-it-works, no host CTA. No sign-in, ever.

Structure, top to bottom:

1. **A compact filter bar** — a region select, a "Filtrlar" control, and a search button. The control is a native `<details>` disclosure holding the remaining filters (district, currency, price range, room range, period, sort, amenities, reset). On mobile it opens as a bottom sheet; from `md` up it is a dropdown panel. Clicking outside closes it. No JavaScript modal, no dependency.
2. **Active filter chips** — one per applied filter, each a link to the same search minus that filter, with the page reset to 1. Clearing the region also clears the district. Sort gets no chip; it is not a filter.
3. **Result count.**
4. **The listing grid** — photo-led cards, the visual focus of the page.
5. **Pagination** — 20 per page.

**Every filter lives in the URL.** The contract is unchanged from before the restructure — same parameter names, same clamps, same drop-the-defaults serialization:

```
region  district  currency  priceMin  priceMax  roomsMin  roomsMax
period  amenity (repeatable)  sort  page
```

`sort=newest` and `page=1` are omitted rather than written. Invalid values are dropped or fall back, never trusted. A URL is shareable, reloadable, and back-button-correct.

Empty state: girih, "Hech narsa topilmadi", one line suggesting fewer filters, and a reset link.

### 1.2 Listing detail (`/uz/listings/[id]`)

Unchanged by this chunk. Photo gallery (first large, keyboard navigable); title, price and — where present — the verified badge above the fold; spec block in mono (rooms, area, floor, available from); description; amenities as a plain list; location as region + district text; contact panel; a quiet report link at the bottom.

A listing that is not publicly visible → **404**. No partial page, no acknowledgement that it exists.

### 1.3 Contact reveal

Unchanged by this chunk. Revealing a phone number requires sign-in: it prevents bulk scraping, gives a demand signal, and costs one magic-link click. Signed out, the action explains that and returns the visitor to the same listing after sign-in. Signed in, it reveals the phone, records a `contact_reveals` row, and offers a Telegram link where one exists.

### 1.4 Favorites

The heart on a card or detail page saves a listing. A signed-out click prompts sign-in and returns. Saved listings live in the **Saqlanganlar** section of `/uz/profile` — they no longer have a route of their own. A favorited listing that later expires stays in the list, marked as no longer available.

---

## Journey 2 — Poster (makler or owner)

### 2.1 Posting a home

"Eʼlon yuklash" → `/uz/post`. Signed out, the gate redirects to login with a return path and brings the user straight back.

`/uz/post` is the **where** step: region, district (Tashkent city only), address line, and a map pin. Submitting saves a **draft** and returns to `/uz/profile`, where the new home appears as a card that names what is still missing.

From that card:

- **Rasm qoʻshish** → `/uz/edit/property/[id]` — upload, reorder, set cover. At least one photo is required to publish; a draft may have none. The database refuses to make a listing active without a photo (`PH001`).
- **Eʼlon berish** → `/uz/post/listing` — title, description, content language, price, currency, period, rooms, area, floor, total floors, available-from date, amenities.
- **Publish** — from the card once a listing exists.

This is three screens, and it is the flow R2 collapses into one. Until then it stays exactly as it is.

### 2.2 Editing

Same forms, prefilled, at `/uz/edit/property/[id]` and `/uz/edit/listing/[id]`. The map opens zoomed to the saved pin at building level. Editing a live home leaves it live. **Changing price or details does not reset the 30-day expiry — only republishing does.**

### 2.3 Publishing, pausing, expiry

Publishing checks the photo, the price and the title. If something is missing, the button says which. Publishing also requires the poster's name and phone to be set (`CT001`); the error links straight to Sozlamalar.

Seven days before expiry the card shows a warning. On expiry the home becomes publicly invisible and the card offers Republish, which resets the 30-day window. No expiry emails in the MVP.

Public visibility is time-filtered, not status-only: a time-expired listing is invisible to the public before any status flip runs.

---

## Journey 3 — Profile (`/uz/profile`)

Signed out → redirect to login with a return path.

Signed in, one responsive page, three sections in order, at **every** viewport. Nothing here is hidden by screen size.

1. **Uylarim** — the user's own homes, one card per home with its state badge, cover photo, address, price and expiry when live, view and reveal counts when live, and the actions appropriate to its state (Edit; Draft: Add photo / Publish, Delete; Live: Pause, View publicly; Paused: Resume, Delete; Expired: Republish, Delete). Nothing is ever silently disabled. Empty state offers "Eʼlon yuklash".
2. **Saqlanganlar** — saved listings, moved here from their own route. Unavailable favorites are shown greyed with a remove action.
3. **Sozlamalar** — the contact details a renter sees only after revealing a listing's contact (full name, phone, Telegram), then the locale switcher, then sign out. The contact form lives here because publishing is database-gated on name and phone; this is the only place a poster can clear that blocker.

This page **will grow into a public makler profile** in a later chunk — listing count, member since, ratings. The sections above are composed rather than inlined so that addition is purely additive. **None of it is built yet.**

---

## Journey 4 — Admin

Unchanged by this chunk except that it is no longer linked.

`/uz/admin`, gated by `requireRole('admin')`. Non-admins get the not-authorized page, not a 404. The role is set by hand in Supabase by changing `profiles.role`; there is no invitation flow.

- **Overview** — counts of homes, live listings and pending verifications, each linking to its queue.
- **Verification queue** (`/uz/admin/verifications`) — oldest pending first. The detail view shows the document behind a short-lived signed URL alongside the property and the host's name, with approve and reject-with-required-reason. The admin is checking one thing: does the name on the cadastral extract match the account holder's name? This queue is intact and reachable; it simply has no submissions while the host-side entry point is hidden.

---

## Out of scope

Not built, and not to be started without a new chunk:

- One-step posting and removing the draft state (**Chunk R2**)
- Dark mode or any theme toggle
- Sale listings, `listing_type`, or any schema change
- Public makler profiles and ratings
- Any change to contact reveal behaviour
- Messaging between users, online payments, saved searches with alerts, map-based search, recommendation algorithms, district derivation from coordinates
- Reports queue and admin all-listings moderation
