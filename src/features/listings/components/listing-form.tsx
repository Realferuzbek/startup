"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createListing, updateListing } from "@/features/listings/actions";
import type { ListingFormState } from "@/features/listings/schema";
import type {
  AmenityOption,
  OwnerPropertyOption,
} from "@/features/listings/queries";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

type ListingInitial = {
  id: string;
  property_id: string;
  title: string;
  description: string | null;
  content_language: "uz" | "ru";
  price_amount: number;
  price_currency: string;
  rental_period: "monthly" | "daily";
  rooms: number | null;
  area_sqm: number | null;
  floor: number | null;
  total_floors: number | null;
  available_from: string | null;
};

type Props = {
  mode: "create" | "edit";
  locale: string;
  amenities: AmenityOption[];
  properties: OwnerPropertyOption[];
  initial?: ListingInitial;
  initialAmenityIds?: number[];
};

const initialState: ListingFormState = { status: "idle" };

// Error keys tied to a specific field (shown inline); anything else is generic
// and shown at the top of the form.
const FIELD_KEYS = [
  "titleInvalid",
  "descriptionInvalid",
  "priceInvalid",
  "roomsInvalid",
  "areaInvalid",
  "floorInvalid",
  "availableFromInvalid",
  "amenityInvalid",
];
const fieldLabel = "text-small text-ink-secondary";

export function ListingForm({
  mode,
  locale,
  amenities,
  properties,
  initial,
  initialAmenityIds = [],
}: Props) {
  const t = useTranslations("listing");
  const action = mode === "create" ? createListing : updateListing;
  const [state, formAction, pending] = useActionState(action, initialState);

  const label = (o: { name_uz: string; name_ru: string }) =>
    locale === "ru" ? o.name_ru : o.name_uz;

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
        <>
          <input type="hidden" name="id" value={initial.id} />
          <input type="hidden" name="property_id" value={initial.property_id} />
        </>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{t("property")}</span>
          <Select name="property_id" required>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address_line}
              </option>
            ))}
          </Select>
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("title")}</span>
        <Input
          name="title"
          required
          minLength={10}
          maxLength={120}
          defaultValue={initial?.title ?? ""}
          aria-invalid={has("titleInvalid") || undefined}
        />
        {fieldMsg("titleInvalid")}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("description")}</span>
        <Textarea
          name="description"
          maxLength={3000}
          rows={4}
          defaultValue={initial?.description ?? ""}
          aria-invalid={has("descriptionInvalid") || undefined}
        />
        {fieldMsg("descriptionInvalid")}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("language")}</span>
        <Select
          name="content_language"
          defaultValue={initial?.content_language ?? "uz"}
        >
          <option value="uz">{t("langUz")}</option>
          <option value="ru">{t("langRu")}</option>
        </Select>
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className={fieldLabel}>{t("price")}</span>
          <Input
            name="price_amount"
            type="number"
            required
            min="1"
            step="0.01"
            defaultValue={initial?.price_amount ?? ""}
            aria-invalid={has("priceInvalid") || undefined}
          />
          {fieldMsg("priceInvalid")}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{t("currency")}</span>
          <Select
            name="price_currency"
            defaultValue={initial?.price_currency ?? "UZS"}
          >
            <option value="UZS">UZS</option>
            <option value="USD">USD</option>
          </Select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("rentalPeriod")}</span>
        <Select
          name="rental_period"
          defaultValue={initial?.rental_period ?? "monthly"}
        >
          <option value="monthly">{t("periodMonthly")}</option>
          <option value="daily">{t("periodDaily")}</option>
        </Select>
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className={fieldLabel}>{t("rooms")}</span>
          <Input
            name="rooms"
            type="number"
            min="1"
            max="20"
            defaultValue={initial?.rooms ?? ""}
            aria-invalid={has("roomsInvalid") || undefined}
          />
          {fieldMsg("roomsInvalid")}
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className={fieldLabel}>{t("area")}</span>
          <Input
            name="area_sqm"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initial?.area_sqm ?? ""}
            aria-invalid={has("areaInvalid") || undefined}
          />
          {fieldMsg("areaInvalid")}
        </label>
      </div>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className={fieldLabel}>{t("floor")}</span>
          <Input
            name="floor"
            type="number"
            defaultValue={initial?.floor ?? ""}
            aria-invalid={has("floorInvalid") || undefined}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className={fieldLabel}>{t("totalFloors")}</span>
          <Input
            name="total_floors"
            type="number"
            min="1"
            defaultValue={initial?.total_floors ?? ""}
            aria-invalid={has("floorInvalid") || undefined}
          />
        </label>
      </div>
      {fieldMsg("floorInvalid")}

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("availableFrom")}</span>
        <Input
          name="available_from"
          type="date"
          defaultValue={initial?.available_from ?? ""}
          aria-invalid={has("availableFromInvalid") || undefined}
        />
        {fieldMsg("availableFromInvalid")}
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className={fieldLabel}>{t("amenities")}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {amenities.map((a) => (
            <label
              key={a.id}
              className="flex min-h-11 cursor-pointer items-center gap-2"
            >
              <Checkbox
                name="amenity_ids"
                value={a.id}
                defaultChecked={initialAmenityIds.includes(a.id)}
              />
              <span className="text-body text-ink">{label(a)}</span>
            </label>
          ))}
        </div>
        {fieldMsg("amenityInvalid")}
      </fieldset>

      <Button type="submit" loading={pending}>
        {mode === "create" ? t("create") : t("save")}
      </Button>
    </form>
  );
}
