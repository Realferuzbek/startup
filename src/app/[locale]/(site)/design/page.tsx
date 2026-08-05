import type { Metadata } from "next";
import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { Girih } from "@/components/shared/girih";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Alert } from "@/components/ui/alert";

// Internal design-system preview. Not linked anywhere; not indexed.
export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const REFERENCE = "Oʻzbekcha gʻisht — Ташкент, Юнусобод";

const PALETTE: { name: string; hex: string }[] = [
  { name: "--paper", hex: "#F7F8FA" },
  { name: "--surface", hex: "#FFFFFF" },
  { name: "--ink", hex: "#0F1720" },
  { name: "--ink-secondary", hex: "#4A5561" },
  { name: "--ink-muted", hex: "#7A8592" },
  { name: "--rule", hex: "#E2E6EB" },
  { name: "--rule-strong", hex: "#C9D0D8" },
  { name: "--registry", hex: "#1B4B8F" },
  { name: "--registry-soft", hex: "#EAF0F8" },
  { name: "--verified", hex: "#0F6E56" },
  { name: "--verified-soft", hex: "#E4F2EC" },
  { name: "--danger", hex: "#A32D2D" },
  { name: "--danger-soft", hex: "#FBEDED" },
  { name: "--warning", hex: "#854F0B" },
  { name: "--warning-soft", hex: "#FBF1E0" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-rule pt-8">
      <h2 className="text-h2 text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default async function DesignPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-ink">Makleer design system</h1>
        <p className="text-small text-ink-muted">
          Internal preview · locale {locale} · noindex
        </p>
      </header>

      {/* ── Palette ── */}
      <Section title="Palette">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {PALETTE.map((c) => (
            <div key={c.name} className="flex flex-col gap-1">
              <div
                className="h-14 w-full rounded-md border border-rule"
                style={{ backgroundColor: `var(${c.name})` }}
              />
              <span className="text-caption text-ink">{c.name}</span>
              <span className="text-caption font-mono text-ink-muted">
                {c.hex}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Type scale ── */}
      <Section title="Type scale (IBM Plex Sans)">
        <div className="flex flex-col gap-3">
          <p className="text-display text-ink">Display · 40 · {REFERENCE}</p>
          <p className="text-h1 text-ink">H1 · 30 · {REFERENCE}</p>
          <p className="text-h2 text-ink">H2 · 22 · {REFERENCE}</p>
          <p className="text-h3 text-ink">H3 · 18 · {REFERENCE}</p>
          <p className="text-body text-ink">Body · 16 · {REFERENCE}</p>
          <p className="text-small text-ink-secondary">
            Small · 14 · {REFERENCE}
          </p>
          <p className="text-caption text-ink-muted">
            Caption · 12 · {REFERENCE}
          </p>
        </div>
      </Section>

      <Section title="Mono (numeric / identifier data + Cyrillic check)">
        <div className="flex flex-col gap-2 font-mono">
          <p className="text-h2 text-ink">{REFERENCE}</p>
          <p className="text-body text-ink">{REFERENCE}</p>
          <p className="text-caption text-ink-muted">{REFERENCE}</p>
          <p className="text-price text-ink">3 500 000 UZS</p>
          <p className="text-body text-ink">55 m² · 4/9 · 2026-08-25</p>
        </div>
      </Section>

      {/* ── Girih ── */}
      <Section title="Girih signature">
        <div className="flex flex-wrap items-end gap-8">
          {[14, 24, 48, 112].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <Girih size={s} className="text-registry" />
              <span className="text-caption font-mono text-ink-muted">
                {s}px · registry
              </span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-2">
            <Girih size={48} className="text-verified" />
            <span className="text-caption font-mono text-ink-muted">
              48px · verified
            </span>
          </div>
        </div>
      </Section>

      {/* ── Buttons ── */}
      <Section title="Buttons">
        <div className="flex flex-col gap-4">
          {(["primary", "secondary", "ghost", "destructive"] as const).map(
            (v) => (
              <div key={v} className="flex flex-wrap items-center gap-3">
                <Button variant={v} size="md">
                  {v} md
                </Button>
                <Button variant={v} size="sm">
                  {v} sm
                </Button>
                <Button variant={v} loading>
                  Loading
                </Button>
                <Button
                  variant={v}
                  disabledReason="Add a photo before publishing"
                >
                  Disabled with reason
                </Button>
              </div>
            ),
          )}
        </div>
      </Section>

      {/* ── Fields ── */}
      <Section title="Fields">
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="d-input">Address</Label>
            <Input id="d-input" placeholder="Placeholder text" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="d-input-err">Price</Label>
            <Input id="d-input-err" aria-invalid defaultValue="—" />
            <span className="text-caption text-danger">
              Enter a valid price
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="d-input-dis">Disabled</Label>
            <Input id="d-input-dis" disabled defaultValue="Not editable" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="d-select">Region</Label>
            <Select id="d-select" defaultValue="">
              <option value="" disabled>
                Select a region
              </option>
              <option>Toshkent shahri</option>
              <option>Andijon viloyati</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor="d-textarea">Description</Label>
            <Textarea id="d-textarea" placeholder="Longer text…" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
              <Checkbox defaultChecked />
              <span className="text-body text-ink">Checked (44px target)</span>
            </label>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
              <Checkbox />
              <span className="text-body text-ink">Unchecked</span>
            </label>
            <label className="inline-flex min-h-11 items-center gap-2 opacity-60">
              <Checkbox disabled />
              <span className="text-body text-ink">Disabled</span>
            </label>
          </div>
        </div>
      </Section>

      {/* ── Cards ── */}
      <Section title="Cards">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card>
            <h3 className="text-h3 text-ink">Card title</h3>
            <p className="text-small text-ink-secondary">
              Surface, hairline border, no shadow. Hover raises the border.
            </p>
          </Card>
          <Card>
            <h3 className="text-h3 text-ink">Another card</h3>
            <p className="text-price font-mono text-ink">3 500 000 UZS</p>
          </Card>
        </div>
      </Section>

      {/* ── Badges ── */}
      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="verified">Verified</Badge>
          <Badge variant="warning">Expiring</Badge>
          <Badge variant="danger">Removed</Badge>
          <VerifiedBadge label="verified" />
        </div>
      </Section>

      {/* ── Skeleton ── */}
      <Section title="Skeletons">
        <div className="flex max-w-md flex-col gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="relative overflow-hidden rounded-md border border-rule bg-surface p-6">
            <div className="pointer-events-none absolute inset-0 grid grid-cols-4 place-items-center text-registry opacity-[0.06]">
              {Array.from({ length: 8 }).map((_, i) => (
                <Girih key={i} size={48} />
              ))}
            </div>
            <p className="relative text-caption font-mono text-ink-muted">
              girih lattice (loading)
            </p>
          </div>
        </div>
      </Section>

      {/* ── Empty state ── */}
      <Section title="Empty state">
        <Card className="p-0">
          <EmptyState
            heading="No listings yet"
            body="Publish your first listing and it appears here for renters to find."
            action={<Button>Create listing</Button>}
          />
        </Card>
      </Section>

      {/* ── Pagination ── */}
      <Section title="Pagination">
        <Pagination
          page={2}
          totalPages={5}
          prevLabel="Previous"
          nextLabel="Next"
          status={
            <span className="font-mono">
              Page 2 <span className="text-ink-muted">/</span> 5
            </span>
          }
          getHref={() => "#"}
        />
      </Section>

      {/* ── Alerts ── */}
      <Section title="Alerts">
        <div className="flex max-w-2xl flex-col gap-3">
          <Alert variant="info" title="Session refresh">
            Your session stays signed in across pages.
          </Alert>
          <Alert variant="warning" title="Listing expiring">
            This listing expires in 3 days. Re-publish to reset the 30-day
            window.
          </Alert>
          <Alert variant="danger" title="Publish blocked">
            Add at least one photo to the property before publishing.
          </Alert>
        </div>
      </Section>
    </main>
  );
}
