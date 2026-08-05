@AGENTS.md

# Makleer — Project Guide

## Product

Makleer — rental marketplace for Uzbekistan that connects estate agents (maklers) with customers. **Rent only for now; sale listings are planned but not built** — do not build them, and do not make them harder to add. Anyone signed in may post: no verification, no approval.

## Motto

> Maklers hold the real inventory in Uzbekistan, but they're invisible and unaccountable — Makleer makes them visible, rated, and accountable.

## Core thesis

Maklers hold the real rental inventory in Uzbekistan. The platform's job is to make them visible and accountable, not to route around them. **The earlier thesis — eliminating agents via state-registry ownership verification — is retired.** Verification survives as a deferred premium feature (see below); it is no longer the argument for the product.

## Verification model

**Deferred as of Chunk R1: hidden from the UI, intact everywhere else.** The tables, RPCs, private bucket, RLS policies, the host submission page (`/[locale]/verify/[id]`) and the admin queue all still exist and still work — only the host's entry point on the home card is commented out, with a note naming what to restore. Verification returns as a premium feature. **Delete nothing.** The rest of this section describes the machinery as built and remains accurate.

Every listing has a `verification_status` field, defaulting to `unverified`. Anyone may create a listing without approval. Verified listings receive a trust badge and rank higher in search. Enforcement is a future config flag, never a schema migration. Never remove or bypass this field.

- **Submission + review** (Chunk 9A): a host submits ownership proof for a property they own via `submit_verification` (SECURITY INVOKER — RLS, the `property_verifications_one_pending` partial unique index, and the `VF001` already-verified trigger enforce the rules). An admin decides via `decide_verification` (SECURITY DEFINER, `is_admin()`-guarded). The `property_verifications` table is the audit trail; **verification attaches to the property**, so a verified owner's re-listings inherit trust.
- **Hosts cannot self-verify.** The `protect_verification_status` BEFORE UPDATE trigger on `properties` allows a non-admin to move `verification_status` only `unverified|rejected → pending` (and never touch `verified_at`); any other change by a non-admin raises `42501`. `verified`/`rejected` are reachable only through the admin RPC (or the service role).
- **Identity documents are never retained.** They live in the **private** `verification-documents` bucket (owner-scoped writes, owner/admin reads, no anon), are re-validated by magic bytes server-side (JPEG/PNG/WebP/PDF; SVG forbidden), and are shown to the reviewer only via a **short-lived signed URL**. On any decision, `decide_verification` clears `document_path` first, then the action best-effort-deletes the storage object — a failed byte-delete leaves an unreachable orphan (path already nulled, bucket private + non-enumerable), never an accessible document. The audit row always survives.
- **Verified-first ranking is default-sort-only.** `search_listings` ranks verified above unverified **only** when `p_sort = 'newest'` (a single query, single ORDER BY); price sorts stay pure.

## Locales

uz (default), ru. All user-facing text goes through next-intl. Never hardcode strings.

## Maps

Yandex Maps only. Do not introduce Google Maps or Mapbox.

## Performance boundary

Every surface is an application interior now — there is no marketing page left. The feed, filters, listing pages, post/edit forms and profile must stay lightweight; target users are on mid-range Android devices over 4G. No Three.js, WebGL, or canvas effects. No dark mode or theme toggle.

## Security rules

- All authorization enforced at the database layer via Row Level Security, never in application code alone
- **Every RLS policy MUST explicitly specify `to authenticated` or `to anon`.** A policy created with no role clause defaults to `public` and therefore applies to **anon** — this has caused three separate bugs in this project (two in Chunk 6, one in Chunk 9A). Worse: when such an anon-applicable policy's `USING`/`WITH CHECK` clause reads a column anon lacks privileges on (e.g. `properties.owner_id`, which anon is column-restricted away from), the caller gets a raw `permission denied for table …` error instead of a clean row-level deny. Always name the role.
- Service role key is server-only
- Identity documents are never retained long-term
- All user input validated with Zod at the API boundary

## Conventions

Feature code lives in `src/features/<feature>`. Shared UI in `src/components/shared`. shadcn primitives in `src/components/ui`.

## Routes and navigation

Route groups under `src/app/[locale]`: `(site)` owns the chrome (header, footer, bottom bar) for every page so the navigation is defined once; `(site)/(gated)` nests inside it and is the `requireUser()` auth gate for the signed-in surfaces. Admin keeps its own `requireRole("admin")` layout inside `(gated)`.

| Route                         | Purpose                                         | Auth       |
| ----------------------------- | ----------------------------------------------- | ---------- |
| `/[locale]`                   | The feed — all active listings                  | none       |
| `/[locale]/listings/[id]`     | Listing detail                                  | none       |
| `/[locale]/post`              | Post a listing — one page, one submit           | required   |
| `/[locale]/edit/[propertyId]` | The same form, prefilled                        | required   |
| `/[locale]/profile`           | Profile hub: Uylarim, Saqlanganlar, Sozlamalar  | required   |
| `/[locale]/verify/[id]`       | Verification submission — **unlinked**          | required   |
| `/[locale]/admin/**`          | Admin, role-gated, **never linked from the UI** | admin only |

`/[locale]/listings` redirects to `/[locale]` preserving the query string; `/[locale]/dashboard/**` redirects to `/[locale]/profile` via one optional catch-all.

**Navigation is exactly three destinations** — Bosh sahifa (`/`), Eʼlon yuklash (`/post`), Profil (`/profile`, labelled Kirish → `/login` when signed out) — defined once in `src/features/navigation/nav-items.ts` and rendered by a desktop header and a fixed mobile bottom bar. Do not add a fourth. The admin link is never rendered; admins type the URL. **There is no footer on any page.**

`/[locale]/post/listing`, `/[locale]/edit/property/[id]` and `/[locale]/edit/listing/[id]` survive only as redirect stubs.

## Posting

**Posting is one page with one submit, and it publishes a live listing.** `src/features/post/` owns it; the same `PostForm` drives create and edit.

- **There are no drafts.** `draft` stays in the `listing_status` enum (removing it would need a migration) but is **never written**. `HomeState.incomplete` covers a property whose posting run stopped before its listing existed, plus any legacy `draft` row; it is labelled "Tugallanmagan" and never called a draft.
- The order property → photos → listing is forced by the data model (photos need a `property_id`; `PH001` needs the photo rows). The **client** orchestrates it across narrow non-redirecting server actions and shows the phases; **all validation runs first**, against the same zod schemas the server uses, so a validation error never leaves a partial record.
- A failed photo upload keeps the property and does **not** publish. Retrying skips the completed phases.
- `publishNewListing` **inserts the listing already `active`** rather than going through `create_listing` (which can only make a draft) and then updating. The lifecycle trigger's INSERT branch runs the same `PH001`/`CT001` gates, and this leaves no window in which a draft row exists — a draft would make the property permanently undeletable. Amenities are inserted immediately after, the one thing the RPC did in the same transaction.
- The contact section renders only when the profile cannot satisfy `CT001`.

## Data model

- `properties` is the physical real-estate object; `listings` are time-bound rental offers. One property has many listings over time. **Verification attaches to the property**, not the listing — so a verified owner's re-listings inherit trust, and verification is never duplicated per offer.
- Listing text is stored **once** in the host's chosen language, tagged by `listings.content_language` (uz|ru). There are **no per-language content columns**; do not add them.
- `listings.owner_id` is denormalized from the parent property and maintained by the `set_listing_owner` BEFORE INSERT/UPDATE trigger. It is authoritative and **never client-supplied** — any client value is overwritten from `properties.owner_id`.
- **Row Level Security is mandatory on every table.** Any new table MUST `enable row level security` and ship explicit policies (and explicit grants — the Supabase cloud default does not auto-grant new tables) in the same migration that creates it. Use the `public.is_admin()` SECURITY DEFINER helper for admin checks to avoid recursive policy evaluation on `profiles`.
- **Amenities** use a localized reference table (`amenities`) + a join table (`listing_amenities`), exactly like regions/districts — localizable without `ALTER TYPE`, never an enum array. Add new amenities by seeding rows, not by migrating a type.
- **Listing status transitions and the 30-day expiry are DB-enforced** by the `enforce_listing_lifecycle` trigger (`draft/active/paused/expired` graph; `removed` is terminal; entering `active` sets `expires_at = now() + 30 days`). Its INSERT branch permits a row born `active`, applying the same gates. Status moves only through the dedicated server actions, never a form field. The app no longer writes `draft` — see Posting above.
- **Public listing visibility is time-filtered, not status-only:** `status = 'active' AND (expires_at IS NULL OR expires_at > now())`. A time-expired listing is invisible to the public even before a status flip runs; `property_photos` and `listing_amenities` public reads use the same filter. A daily `pg_cron` job (`expire-listings`) flips time-expired rows to `expired` for the host dashboard label — correctness never depends on it.
- **A listing cannot become `active` unless its property has ≥1 `property_photos` row** — enforced inside `enforce_listing_lifecycle` (distinct SQLSTATE `PH001`, surfaced to hosts as an actionable message). Price ceilings are **currency-aware** and enforced at both the Zod boundary and the DB CHECK: UZS ≤ 1,000,000,000, USD ≤ 1,000,000 (both > 0).
- Migrations live in `supabase/migrations/`. Apply with `npm run db:push`; regenerate types with `npm run db:types`; prove RLS with `npm run test:rls`.

## Photos

- **Photos attach to `properties`, not listings** (`property_photos`): a host re-listing the same apartment reuses them and never re-uploads. Public read is gated by the property having a publicly-visible listing (same time filter as listings).
- **Public Storage bucket `property-photos`** (CDN-cacheable, no per-image signed URL). Object paths are **UUID-based and non-enumerable** (`{property_id}/{uuid}.{ext}`). Tradeoff: the bytes are public to anyone who knows a path, mitigated by non-enumerability — and the _row_ that reveals the path is itself gated by the active-listing filter. Bucket restricts MIME to JPEG/PNG/WebP with a 2 MB limit.
- **Uploads are re-validated server-side by magic bytes** (`src/features/photos/magic-bytes.ts`) — the declared MIME/extension is untrusted. **SVG is permanently forbidden** (XSS vector) at every layer. Filenames are server-generated UUIDs; Storage RLS (owner-scoped by the path's property segment) authorizes writes using the **caller's session, never the service role**. Hard limits: 2 MB/file, 15 photos/property.
- `phash` (dHash via `sharp`) is captured on every upload so it exists from day one; **no duplicate-detection logic is built yet**.
- Coordinate/photo write paths never bypass RLS. Delete removes the DB row first, then the storage object (a failed object delete leaves at most a harmless orphan, never a dangling row).

## Geography

- Regions are the 14 first-level administrative units. **Districts exist for Tashkent city only** (12 tumanlar); every other region intentionally has none. Do not invent districts for other regions.
- A property's `district_id` is nullable, but when set it **must belong to the property's region** — enforced by the `enforce_property_district_region` BEFORE INSERT/UPDATE trigger. The app additionally requires a district when the region is Tashkent city.
- **PostGIS coordinate order is `(longitude, latitude)`** — `ST_MakePoint(lng, lat)`, longitude first. Swapping is silent and catastrophic; there is a regression test in `supabase/tests/rls.sql` (assertion 14) that round-trips a known Tashkent coordinate. The Yandex JS API v3 also uses `[longitude, latitude]`.
- Coordinates are **written** through the `create_property` / `update_property` RPCs (`SECURITY INVOKER`, so RLS applies; `owner_id` taken from the session; the point built once with the order commented) and **read** through the `properties_with_coords` view (`security_invoker = true`, projecting numeric `latitude`/`longitude`). Neither uses `SECURITY DEFINER` — RLS is never bypassed. Coordinate bounds (approx. Uzbekistan) are enforced by the `properties_location_bounds` CHECK and re-validated with Zod at the action boundary.

## Privacy

- `properties.address_line` and exact coordinates (`location`) are **host-private** and must NEVER reach a public page or any public API response. **Public location granularity is region + district only.** anon is **column-restricted** on `properties` (SELECT only `id, region_id, district_id, verification_status`) so the guarantee holds even against a hand-crafted anon API call. Owner identity beyond a display name is never exposed publicly (no email/phone/user id).
- **Profiles are owner-and-admin-readable only** — RLS `profiles_select_own` (`(select auth.uid()) = id OR public.is_admin()`), never world-readable. A renter never reads a profile row; the owner's phone reaches them **only** through the rate-limited `reveal_contact` SECURITY DEFINER RPC, which is the sole phone-disclosure path. (Admins read profiles through the same policy — that is how the verification queue resolves a host's `full_name`.)
- Exact coordinates are stored precisely, but on **public** listing pages they must be displayed approximately (offset/radius) — no map on public pages until that fuzzing lands (Chunk 7).
- Public browse/detail run through an **always-anon client** (`src/lib/supabase/anon.ts`) so RLS is the enforcement boundary even for a signed-in visitor. Public queries select only host-safe columns; the `search_listings` RPC returns none of the private fields.
- Public browse **filters are URL-driven** (every filter change updates the query string) for SEO, shareability, and back-button correctness — never React-only state.
- `increment_listing_view` is `SECURITY DEFINER` **by necessity** (anon has no UPDATE grant on `listings`), **narrowly scoped** (only `view_count`, only when the listing is publicly visible), and **naive by design** (refresh-inflatable, no dedup).

## Known gaps

1. `district_id` is host-selected and can contradict the pinned coordinates. Planned fix: load Tashkent district boundary polygons into PostGIS and derive/validate district from the coordinate via `ST_Contains`. Scheduled for the search chunk. Do not implement early.
2. Perceptual hashes (`property_photos.phash`) are stored on every upload, but no duplicate-detection / anti-scam matching logic exists yet.
3. Photo delete removes the DB row first, then the Storage object, so a failed object delete leaves an **orphaned public Storage object** (its row and card are gone, but the bytes persist under a non-enumerable UUID path). A reconciliation / garbage-collection sweep is not built yet.

## Framework conventions

- This project runs **Next.js 16**. Request middleware lives at `src/proxy.ts` (the Next 16 convention). A `middleware.ts` file is **NOT loaded** by this version.
- Supabase's official auth docs specify a `middleware.ts` for session refresh. **Do NOT add that file.** Supabase session refresh is composed **into** the existing next-intl proxy at `src/proxy.ts`, not added as a separate middleware file.

## Auth

- **Email magic-link only** for MVP. No passwords, SMS, or social providers. Phone OTP is deferred — `profiles.phone` is already nullable to accommodate it later. **`profiles.phone` is UNIQUE**; a collision on profile save is caught (`23505`) and surfaced as the translated `profile.phoneTaken`, worded to reveal nothing about the other account.
- **Authorization always uses `supabase.auth.getUser()`, never `getSession()`.** `getUser()` validates the token with the auth server; `getSession()` trusts unvalidated cookie data and is forbidden for any gating decision.
- **Three-layer protection:** (1) `src/proxy.ts` refreshes/validates the session on every request, keeping auth state fresh; (2) server-component helpers `requireUser()` / `requireRole()` (`src/features/auth/session.ts`) perform the actual redirect gate (→ `/login` or `/not-authorized`); (3) database RLS is the final authority — the app layer never grants access the database wouldn't.
- The auth callback (`src/app/[locale]/auth/callback/route.ts`) is a **Route Handler, never a page** — it exchanges the code for a session and redirects.
- Session-cookie survival across locale redirects is handled by the explicit cookie-merge in `src/proxy.ts`. Do not remove it: without it, every `/` → `/uz` style redirect silently drops the refreshed session.
- The service role key is never used for auth — magic-link uses the anon client plus the user's own session.
