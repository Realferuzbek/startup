"use client";

import { useActionState, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { createProperty, updateProperty } from "@/features/properties/actions";
import type { PropertyFormState } from "@/features/properties/schema";
import type {
  RegionOption,
  DistrictOption,
} from "@/features/properties/queries";
import type { Coordinate } from "./map-picker";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

// The map (and the Yandex script it loads) must never enter the shared bundle:
// dynamically imported, client-only.
const MapPicker = dynamic(
  () => import("./map-picker").then((m) => m.MapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="border-rule h-64 w-full animate-pulse rounded-md border" />
    ),
  },
);

type Props = {
  mode: "create" | "edit";
  locale: string;
  regions: RegionOption[];
  districts: DistrictOption[];
  tashkentCityRegionId: number | null;
  initial?: {
    id: string;
    region_id: number;
    district_id: number | null;
    address_line: string;
    latitude: number;
    longitude: number;
  };
};

const initialState: PropertyFormState = { status: "idle" };

// Error keys that belong to a specific field (shown inline); anything else is a
// generic error shown at the top of the form.
const FIELD_KEYS = [
  "districtRequired",
  "addressInvalid",
  "locationRequired",
  "locationOutOfBounds",
];
const fieldLabel = "text-small text-ink-secondary";

export function PropertyForm({
  mode,
  locale,
  regions,
  districts,
  tashkentCityRegionId,
  initial,
}: Props) {
  const t = useTranslations("property");
  const action = mode === "create" ? createProperty : updateProperty;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [regionId, setRegionId] = useState<number | "">(
    initial?.region_id ?? "",
  );
  const [districtId, setDistrictId] = useState<number | "">(
    initial?.district_id ?? "",
  );
  const [coord, setCoord] = useState<Coordinate | null>(
    initial
      ? { latitude: initial.latitude, longitude: initial.longitude }
      : null,
  );

  const label = (o: { name_uz: string; name_ru: string }) =>
    locale === "ru" ? o.name_ru : o.name_uz;

  const showDistricts = regionId !== "" && regionId === tashkentCityRegionId;
  const districtOptions = useMemo(
    () => districts.filter((d) => d.region_id === regionId),
    [districts, regionId],
  );

  const err = state.status === "error" ? state.error : null;
  const has = (key: string) => err === key;
  const fieldMsg = (key: string) =>
    has(key) ? <p className="text-caption text-danger">{t(key)}</p> : null;

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {err && !FIELD_KEYS.includes(err) ? (
        <Alert variant="danger">{t(err)}</Alert>
      ) : null}

      {mode === "edit" && initial ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("regionLabel")}</span>
        <Select
          name="region_id"
          required
          value={regionId}
          onChange={(e) => {
            setRegionId(Number(e.target.value));
            setDistrictId("");
          }}
        >
          <option value="" disabled>
            {t("regionPlaceholder")}
          </option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {label(r)}
            </option>
          ))}
        </Select>
      </label>

      {showDistricts ? (
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{t("districtLabel")}</span>
          <Select
            name="district_id"
            required
            value={districtId}
            aria-invalid={has("districtRequired") || undefined}
            onChange={(e) => setDistrictId(Number(e.target.value))}
          >
            <option value="" disabled>
              {t("districtPlaceholder")}
            </option>
            {districtOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {label(d)}
              </option>
            ))}
          </Select>
          {fieldMsg("districtRequired")}
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("addressLabel")}</span>
        <Input
          name="address_line"
          required
          defaultValue={initial?.address_line ?? ""}
          aria-invalid={has("addressInvalid") || undefined}
        />
        {fieldMsg("addressInvalid")}
      </label>

      <div className="flex flex-col gap-1.5">
        <MapPicker locale={locale} value={coord} onChange={setCoord} />
        <input type="hidden" name="latitude" value={coord?.latitude ?? ""} />
        <input type="hidden" name="longitude" value={coord?.longitude ?? ""} />
        {fieldMsg("locationRequired")}
        {fieldMsg("locationOutOfBounds")}
      </div>

      <Button type="submit" loading={pending}>
        {mode === "create" ? t("create") : t("save")}
      </Button>
    </form>
  );
}
