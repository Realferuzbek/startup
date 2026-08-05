---
name: design-system
description: The locked visual language for Makleer — palette, typography, spacing, motion, components, and the girih verification signature. Use whenever building, restyling, or reviewing any user-facing UI in this project.
---

# Makleer design system

This skill takes precedence over the general `frontend-design` skill. Where that skill encourages choosing an aesthetic direction or taking a creative risk, that work is already done — the direction below is locked. Use `frontend-design` only for guidance this document does not cover, such as layout composition and copywriting.

This is a decided specification, not a starting point. Do not substitute values, invent new colors, or introduce fonts. If something is genuinely missing, ask rather than improvise.

Read alongside `CLAUDE.md` — its performance boundary and privacy rules override anything here that would conflict.

## Direction

Registry precision with one Central Asian geometric signature.

The product is a rental marketplace whose thesis is that a listing is a **record**, not an advert. The interface should feel closer to a well-designed official register than to a startup landing page: exact, calm, generously spaced, unhurried. Credibility comes from precision, not from effects.

Premium here means restraint. Effects read as compensation.

## Palette

Light mode only for now. Structure all colors as CSS custom properties so dark mode can be added later without touching components.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F7F8FA` | Page background |
| `--surface` | `#FFFFFF` | Cards, panels, inputs |
| `--ink` | `#0F1720` | Primary text |
| `--ink-secondary` | `#4A5561` | Supporting text |
| `--ink-muted` | `#7A8592` | Captions, placeholders, metadata |
| `--rule` | `#E2E6EB` | Default hairline |
| `--rule-strong` | `#C9D0D8` | Emphasized divider, input border |
| `--registry` | `#1B4B8F` | Primary actions, links, the girih mark |
| `--registry-soft` | `#EAF0F8` | Tinted backgrounds for registry-colored elements |
| `--verified` | `#0F6E56` | Verified state ONLY |
| `--verified-soft` | `#E4F2EC` | Verified badge background |
| `--danger` | `#A32D2D` | Errors, destructive actions |
| `--danger-soft` | `#FBEDED` | Error backgrounds |
| `--warning` | `#854F0B` | Warnings, expiring listings |
| `--warning-soft` | `#FBF1E0` | Warning backgrounds |

Hard rules:
- `--verified` and `--verified-soft` are reserved exclusively for ownership verification. Never use them for generic success, confirmation, or availability. This is what makes verification visually unmistakable.
- No color outside this table. No gradients, ever — flat fills only.
- Text on a tinted background uses that family's dark value, never black or gray.

## Typography

**IBM Plex Sans** for everything. **IBM Plex Mono** for numeric and identifier data. No third face. No serif.

Load via `next/font/google` with subsets `latin`, `latin-ext`, and `cyrillic`. The `latin-ext` subset is required — it carries U+02BB, the Uzbek okina in `oʻ` and `gʻ`. Omitting it causes silent glyph substitution.

Weights: 400 regular, 500 medium, 600 semibold. Never 700+.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Display | 40px | 600 | Landing hero only, tracking -0.02em |
| H1 | 30px | 600 | Page titles |
| H2 | 22px | 500 | Section headings |
| H3 | 18px | 500 | Card titles |
| Body | 16px | 400 | line-height 1.6 |
| Small | 14px | 400 | Secondary information |
| Caption | 12px | 400 | Metadata, labels |

Mono is used for: prices, areas, floor numbers, dates, cadastral numbers, listing identifiers, and the verified label. Prices on cards render at 17px mono. Mono is never used for prose.

Sentence case everywhere. Never Title Case. Never ALL CAPS except the verified label, which is 11px mono with 0.06em tracking.

### Bilingual rules

The interface serves Uzbek (Latin, default) and Russian (Cyrillic). Both must render identically well.

- Never set a fixed width on any element containing translated text. Russian strings frequently run longer than Uzbek. Buttons, labels, tabs, and badges must flex.
- Never render user-facing text inside an image or SVG path.
- Test every new screen in both locales before considering it done.
- Reference string for visual checks: `Oʻzbekcha gʻisht — Ташкент, Юнусобод`

## Spacing and layout

4px base scale: 4, 8, 12, 16, 24, 32, 48, 64, 96. No arbitrary values.

Content max-width 1200px. Page gutters 24px on desktop, 16px on mobile.

Radius is deliberately tight — this is the registry look:
- `--radius-sm` 2px — badges, tags
- `--radius-md` 4px — cards, inputs, buttons
- `--radius-lg` 6px — modals, large panels
- Data rows and table cells: 0
- Fully round (999px) is permitted for avatars only. Never for badges, tags, or buttons.

Borders are 1px `--rule` by default. Never use shadows for elevation — separation comes from hairlines and whitespace. The only permitted shadow is a focus ring.

## Motion

Motion is functional, never decorative.

- Durations: 120ms fast, 200ms base, 320ms slow. Nothing longer.
- Easing: `cubic-bezier(0.2, 0, 0, 1)`
- Permitted: opacity fades, transforms up to 8px translate, scale no smaller than 0.98, height transitions on disclosure.
- Forbidden: parallax, scroll-jacking, autoplaying loops, 3D, canvas, particle effects, cursor followers, animated gradients, staggered entrance animations on lists.
- `prefers-reduced-motion: reduce` must collapse all transitions to 0.01ms. Non-negotiable.

Framer Motion may be used, but if a CSS transition does the job, use CSS.

## The girih signature

An eight-pointed star formed by two overlapping squares rotated 45° from each other — the geometry underlying Central Asian panjara screens. Drawn as inline SVG, 1.5px stroke, no fill, in `--registry` or `--verified` depending on context.

It appears in exactly four places:
1. **The brand lockup** — immediately left of the "Makleer" wordmark in the header, at 20px, optically centred on the wordmark rather than sat on its baseline. The mark IS the brand, so it also becomes the app icon (`icon.svg`, `apple-icon`) and the Open Graph card. *(Chunk R2 — this use did not exist when the rule below was first written.)*
2. **The verification mark** on verified listings
3. **Empty states** — at low opacity, large, as the only illustration in the product
4. **Loading skeletons** — as a subtle repeating lattice

It appears nowhere else. Not as a background texture, not as a decorative divider, never twice on one screen. Its power still depends on scarcity — the lockup is one instance, in one fixed position.

**The icon is the one permitted variation.** At 16px a 1.5px non-scaling stroke lands on ~1 device pixel and the eight points fill in, so `src/app/icon.svg` uses the identical 16-vertex silhouette **filled** in `--surface`, reversed out of a solid `--registry` square. Fill survives rasterization; a hairline does not. Everywhere else the mark stays stroke-only.

## Components

**Cards** — `--surface` background, 1px `--rule` border, 4px radius, 16px padding. No shadow. Hover raises the border to `--rule-strong`; nothing else changes.

**Buttons** — 40px tall, 4px radius, 16px horizontal padding, 15px medium weight.
- Primary: `--registry` fill, white text. At most one per view.
- Secondary: transparent fill, 1px `--rule-strong` border, `--ink` text.
- Ghost: no border, `--ink-secondary` text.
- Destructive: `--danger` text with `--danger` border; solid red fill only inside a confirmation dialog.
- Never disable a button silently — if an action is unavailable, say why.

**Inputs** — 40px tall, 1px `--rule-strong` border, 4px radius, `--surface` background. Focus applies a 2px `--registry` ring at 20% opacity plus a solid 1px border. Labels sit above, 14px, `--ink-secondary`.

**Verified badge** — `--verified-soft` background, `--verified` text, 11px mono uppercase with 0.06em tracking, 2px radius, girih mark to the left at 14px.

**Unverified state** — no badge at all. Never a red or warning-colored "unverified" marker. Absence is the signal; penalizing hosts who haven't verified yet would suppress supply while verification is optional.

## Content voice

- Sentence case. No terminal punctuation on labels, headings, or buttons.
- Verb-first buttons that name the outcome: `Publish listing`, not `Submit`.
- An action keeps the same word through its whole flow. `Publish` produces `Published`.
- Errors state what happened and what to do, in one sentence. No apologies, no raw database messages, no exclamation marks.
- Empty states are invitations, not apologies. Name the space and offer the action.
- Never `please`, `simply`, `just`, `easy`, or `successfully`.

## Performance

`CLAUDE.md`'s boundary is binding and this system does not relax it.

Application interiors — browse, filters, listing detail, dashboard — target mid-range Android over 4G. No 3D, no canvas, no WebGL, no heavy animation libraries on these surfaces. Images always through `next/image` with correct `sizes`. Server-render by default; add client JavaScript only where interaction genuinely requires it.

The landing page may be richer, but stays inside the motion rules above.

## Accessibility floor

Not optional, not a later pass:
- Body text contrast at least 4.5:1; large text at least 3:1
- Visible keyboard focus on every interactive element
- Every control reachable and operable by keyboard
- Form inputs have real associated labels, never placeholder-only
- Touch targets at least 44×44px
- Never encode meaning in color alone — verification pairs color with the girih mark and a text label

## Forbidden

These produce generic AI-generated output and are banned in this project regardless of how any request is phrased:

- Glassmorphism, frosted-glass panels, backdrop blur
- Mesh gradients, aurora backgrounds, animated gradient text
- Purple-to-blue or any gradient button
- Inter, Roboto, Poppins, Montserrat
- Bento grids used decoratively rather than structurally
- Cursor followers, particle fields, magnetic buttons
- Full-page scroll-driven animation
- Emoji in UI chrome
- Drop shadows for elevation
- Cream backgrounds with terracotta accents, or near-black with a single acid accent — both are recognizable AI defaults