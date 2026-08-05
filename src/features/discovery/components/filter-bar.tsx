"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { SORTS, type ListingFilters } from "@/features/discovery/search-params";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button, buttonVariants } from "@/components/ui/button";

type Option = { id: number; name_uz: string; name_ru: string };
type DistrictOption = Option & { region_id: number };

const fieldLabel = "text-small text-ink-secondary";

// The disclosure panel. A bottom sheet below md, a dropdown from md up — both
// are the same native <details>, no modal library and no client-side open
// state. Inputs stay mounted while collapsed, so a closed panel still submits
// the filters it holds.
const panel =
  "fixed inset-x-0 bottom-0 z-[60] max-h-[80dvh] overflow-y-auto " +
  "rounded-t-lg border-t border-rule bg-surface p-4 " +
  "pb-[calc(1rem+env(safe-area-inset-bottom))] " +
  "md:absolute md:inset-x-auto md:top-full md:right-0 md:bottom-auto md:z-50 " +
  "md:mt-2 md:max-h-[70vh] md:w-[26rem] md:rounded-md md:border md:pb-4";

// While the panel is open, the summary grows a full-viewport ::before layer
// underneath it. Clicking anywhere outside toggles the disclosure shut, because
// the layer belongs to the summary — CSS only, no listeners.
const summaryControl =
  "border-rule-strong text-ink text-button flex h-10 cursor-pointer list-none " +
  "items-center gap-2 rounded-md border px-4 font-medium " +
  "focus-visible:ring-2 focus-visible:ring-registry/40 focus-visible:outline-none " +
  "[&::-webkit-details-marker]:hidden " +
  "group-open:before:fixed group-open:before:inset-0 group-open:before:z-50 " +
  "group-open:before:content-['']";

export function FilterBar({
  locale,
  filters,
  regions,
  districts,
  amenities,
  tashkentCityRegionId,
}: {
  locale: string;
  filters: ListingFilters;
  regions: Option[];
  districts: DistrictOption[];
  amenities: Option[];
  tashkentCityRegionId: number | null;
}) {
  const t = useTranslations("discovery");
  const router = useRouter();
  // The search navigation is a transition, so the button can say it is working
  // while the server re-runs the query.
  const [searching, startSearch] = useTransition();
  const [regionId, setRegionId] = useState<number | "">(filters.region ?? "");

  const label = (o: Option) => (locale === "ru" ? o.name_ru : o.name_uz);
  const showDistricts = regionId !== "" && regionId === tashkentCityRegionId;
  const districtOptions = districts.filter((d) => d.region_id === regionId);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const p = new URLSearchParams();
    const set = (k: string, v: FormDataEntryValue | null) => {
      if (typeof v === "string" && v.trim() !== "") p.set(k, v.trim());
    };
    set("region", fd.get("region"));
    if (showDistricts) set("district", fd.get("district"));
    set("currency", fd.get("currency"));
    set("priceMin", fd.get("priceMin"));
    set("priceMax", fd.get("priceMax"));
    set("roomsMin", fd.get("roomsMin"));
    set("roomsMax", fd.get("roomsMax"));
    set("period", fd.get("period"));
    for (const a of fd.getAll("amenity")) {
      if (typeof a === "string") p.append("amenity", a);
    }
    const sort = fd.get("sort");
    if (typeof sort === "string" && sort !== "newest") p.set("sort", sort);

    const qs = p.toString();
    startSearch(() => router.push(`/${qs ? `?${qs}` : ""}`));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <Select
          name="region"
          aria-label={t("region")}
          value={regionId}
          onChange={(e) =>
            setRegionId(e.target.value === "" ? "" : Number(e.target.value))
          }
        >
          <option value="">{t("region")}</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {label(r)}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex shrink-0 gap-2">
        <details className="group relative">
          <summary className={summaryControl}>
            {t("filters")}
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-ink-muted"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </summary>

          <div className={panel}>
            <div className="flex flex-col gap-4">
              {showDistricts ? (
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>{t("district")}</span>
                  <Select name="district" defaultValue={filters.district ?? ""}>
                    <option value="">{t("any")}</option>
                    {districtOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {label(d)}
                      </option>
                    ))}
                  </Select>
                </label>
              ) : null}

              <label className="flex flex-col gap-1.5">
                <span className={fieldLabel}>{t("currency")}</span>
                <Select name="currency" defaultValue={filters.currency ?? ""}>
                  <option value="">{t("any")}</option>
                  <option value="UZS">UZS</option>
                  <option value="USD">USD</option>
                </Select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>{t("priceMin")}</span>
                  <Input
                    name="priceMin"
                    type="number"
                    min="0"
                    defaultValue={filters.priceMin ?? ""}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>{t("priceMax")}</span>
                  <Input
                    name="priceMax"
                    type="number"
                    min="0"
                    defaultValue={filters.priceMax ?? ""}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>{t("roomsMin")}</span>
                  <Input
                    name="roomsMin"
                    type="number"
                    min="1"
                    max="20"
                    defaultValue={filters.roomsMin ?? ""}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>{t("roomsMax")}</span>
                  <Input
                    name="roomsMax"
                    type="number"
                    min="1"
                    max="20"
                    defaultValue={filters.roomsMax ?? ""}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className={fieldLabel}>{t("period")}</span>
                <Select name="period" defaultValue={filters.period ?? ""}>
                  <option value="">{t("any")}</option>
                  <option value="monthly">{t("periodMonthly")}</option>
                  <option value="daily">{t("periodDaily")}</option>
                </Select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={fieldLabel}>{t("sort")}</span>
                <Select name="sort" defaultValue={filters.sort}>
                  {SORTS.map((s) => (
                    <option key={s} value={s}>
                      {t(`sort_${s}`)}
                    </option>
                  ))}
                </Select>
              </label>

              <fieldset className="flex flex-col gap-2">
                <legend className={fieldLabel}>{t("amenities")}</legend>
                <div className="flex flex-col gap-2">
                  {amenities.map((a) => (
                    <label
                      key={a.id}
                      className="flex min-h-11 cursor-pointer items-center gap-2"
                    >
                      <Checkbox
                        name="amenity"
                        value={a.id}
                        defaultChecked={filters.amenities.includes(a.id)}
                      />
                      <span className="text-body text-ink">{label(a)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" loading={searching}>
                  {t("search")}
                </Button>
                <Link href="/" className={buttonVariants({ variant: "ghost" })}>
                  {t("reset")}
                </Link>
              </div>
            </div>
          </div>
        </details>

        <Button type="submit">{t("search")}</Button>
      </div>
    </form>
  );
}
