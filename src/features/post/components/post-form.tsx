"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type {
  RegionOption,
  DistrictOption,
} from "@/features/properties/queries";
import type { AmenityOption } from "@/features/listings/queries";
import type { Coordinate } from "@/features/properties/components/map-picker";
import { updateProfile } from "@/features/profile/actions";
import {
  createPostProperty,
  updatePostProperty,
} from "@/features/properties/actions";
import {
  publishNewListing,
  updatePostListing,
} from "@/features/listings/actions";
import { uploadPropertyPhoto } from "@/features/photos/actions";
import { prepareImage } from "@/features/photos/image-prep";
import {
  validatePost,
  contactFormData,
  propertyFormData,
  listingFormData,
  type FieldErrors,
  type PostValues,
} from "../schema";
import { PhotoStaging, type StagedPhoto } from "./photo-staging";
import { SubmitProgress, type Phase } from "./submit-progress";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

// The map (and the Yandex script it loads) must never enter the shared bundle.
const MapPicker = dynamic(
  () =>
    import("@/features/properties/components/map-picker").then(
      (m) => m.MapPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="border-rule h-64 w-full animate-pulse rounded-md border" />
    ),
  },
);

export type PostListingInitial = {
  id: string;
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

export type PostInitial = {
  propertyId: string;
  region_id: number;
  district_id: number | null;
  address_line: string;
  latitude: number;
  longitude: number;
  listing: PostListingInitial | null;
  amenityIds: number[];
};

type Props = {
  mode: "create" | "edit";
  locale: string;
  regions: RegionOption[];
  districts: DistrictOption[];
  tashkentCityRegionId: number | null;
  amenities: AmenityOption[];
  /** True when the profile is missing a name or phone — CT001 would refuse. */
  needsContact: boolean;
  contact: { full_name: string; phone: string; telegram_username: string };
  initial?: PostInitial;
  /** Edit mode only: the server-rendered <PhotoManager/>, which acts immediately. */
  photoSlot?: ReactNode;
  /** Edit mode only: how many photos already exist, for the publish gate. */
  existingPhotoCount?: number;
};

const fieldLabel = "text-small text-ink-secondary";

// Which namespace owns each message key. Every key here already existed for the
// three forms this page replaces — the combined form invents no new vocabulary.
const NAMESPACE: Record<string, string> = {
  fullNameInvalid: "profile",
  phoneInvalid: "profile",
  telegramInvalid: "profile",
  phoneTaken: "profile",
  regionRequired: "property",
  districtRequired: "property",
  addressInvalid: "property",
  locationRequired: "property",
  locationOutOfBounds: "property",
  titleInvalid: "listing",
  descriptionInvalid: "listing",
  priceInvalid: "listing",
  roomsInvalid: "listing",
  areaInvalid: "listing",
  floorInvalid: "listing",
  availableFromInvalid: "listing",
  amenityInvalid: "listing",
  notOwner: "listing",
  invalidTransition: "listing",
  activeListingExists: "listing",
  contactRequired: "listing",
  notFound: "listing",
  uploadFailed: "photo",
  fileTooLarge: "photo",
  wrongFileType: "photo",
  notImage: "photo",
  tooManyPhotos: "photo",
  lastPhotoActive: "photo",
};

export function PostForm({
  mode,
  locale,
  regions,
  districts,
  tashkentCityRegionId,
  amenities,
  needsContact,
  contact,
  initial,
  photoSlot,
  existingPhotoCount = 0,
}: Props) {
  const t = useTranslations("post");
  const tProfile = useTranslations("profile");
  const tProperty = useTranslations("property");
  const tListing = useTranslations("listing");
  const tPhoto = useTranslations("photo");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const listing = initial?.listing ?? null;

  const [values, setValues] = useState<PostValues>({
    full_name: contact.full_name,
    phone: contact.phone,
    telegram_username: contact.telegram_username,
    region_id: initial?.region_id ?? "",
    district_id: initial?.district_id ?? "",
    address_line: initial?.address_line ?? "",
    latitude: initial?.latitude ?? null,
    longitude: initial?.longitude ?? null,
    title: listing?.title ?? "",
    description: listing?.description ?? "",
    content_language: listing?.content_language ?? "uz",
    price_amount: listing ? String(listing.price_amount) : "",
    price_currency: listing?.price_currency ?? "UZS",
    rental_period: listing?.rental_period ?? "monthly",
    rooms: listing?.rooms != null ? String(listing.rooms) : "",
    area_sqm: listing?.area_sqm != null ? String(listing.area_sqm) : "",
    floor: listing?.floor != null ? String(listing.floor) : "",
    total_floors:
      listing?.total_floors != null ? String(listing.total_floors) : "",
    available_from: listing?.available_from ?? "",
    amenity_ids: initial?.amenityIds ?? [],
  });

  const [photos, setPhotos] = useState<StagedPhoto[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [phases, setPhases] = useState<Phase[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(
    initial?.propertyId ?? null,
  );

  const set = <K extends keyof PostValues>(key: K, value: PostValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const label = (o: { name_uz: string; name_ru: string }) =>
    locale === "ru" ? o.name_ru : o.name_uz;

  const showDistricts =
    values.region_id !== "" && values.region_id === tashkentCityRegionId;
  const districtOptions = useMemo(
    () => districts.filter((d) => d.region_id === values.region_id),
    [districts, values.region_id],
  );

  // Resolves a message key to its owning namespace's translation.
  function message(key: string): string {
    switch (NAMESPACE[key]) {
      case "profile":
        return tProfile(key);
      case "property":
        return tProperty(key);
      case "listing":
        return tListing(key);
      case "photo":
        return tPhoto(key);
      default:
        // `needsPhotos` and `photosRequired` both mean "add a photo first".
        if (key === "needsPhotos") return tPhoto("cannotPublish");
        if (key === "photosRequired") return t("photosRequired");
        return t("errorGeneric");
    }
  }

  const fieldMsg = (field: string) =>
    errors[field] ? (
      <p className="text-caption text-danger">{message(errors[field])}</p>
    ) : null;
  const invalid = (field: string) => (errors[field] ? true : undefined);

  function updatePhase(key: Phase["key"], patch: Partial<Phase>) {
    setPhases((prev) =>
      prev ? prev.map((p) => (p.key === key ? { ...p, ...patch } : p)) : prev,
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const photoCount = mode === "create" ? photos.length : existingPhotoCount;

    // Nothing is created until every section passes. This is what makes a
    // validation error incapable of leaving a partial record behind.
    const found = validatePost(values, {
      needsContact,
      tashkentCityRegionId,
      photoCount,
    });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }

    setSubmitting(true);
    const pending: Phase[] = [];
    if (needsContact) pending.push({ key: "contact", state: "pending" });
    pending.push({ key: "property", state: "pending" });
    if (mode === "create") {
      pending.push({
        key: "photos",
        state: "pending",
        done: photos.filter((p) => p.uploaded).length,
        total: photos.length,
      });
    }
    pending.push({ key: "publish", state: "pending" });
    setPhases(pending);

    try {
      // ── Phase 1 — contact ────────────────────────────────────────────────
      if (needsContact) {
        updatePhase("contact", { state: "running" });
        const res = await updateProfile(
          { status: "idle" },
          contactFormData(values),
        );
        if (res.status === "error") {
          updatePhase("contact", { state: "failed" });
          setErrors({ [contactField(res.error)]: res.error ?? "errorGeneric" });
          setSubmitting(false);
          return;
        }
        updatePhase("contact", { state: "done" });
      }

      // ── Phase 2 — property ───────────────────────────────────────────────
      // Skipped on a retry: the property from the failed run is reused, so
      // nothing is re-entered and no duplicate is created.
      let propertyId = createdPropertyId;
      updatePhase("property", { state: "running" });
      if (mode === "edit" && initial) {
        const res = await updatePostProperty(
          propertyFormData(values, initial.propertyId),
        );
        if (!res.ok) {
          updatePhase("property", { state: "failed" });
          setErrors({ [propertyField(res.error)]: res.error });
          setSubmitting(false);
          return;
        }
        propertyId = initial.propertyId;
      } else if (!propertyId) {
        const res = await createPostProperty(propertyFormData(values));
        if (!res.ok) {
          updatePhase("property", { state: "failed" });
          setErrors({ [propertyField(res.error)]: res.error });
          setSubmitting(false);
          return;
        }
        propertyId = res.id;
        setCreatedPropertyId(res.id);
      }
      updatePhase("property", { state: "done" });

      // ── Phase 3 — photos ─────────────────────────────────────────────────
      if (mode === "create") {
        updatePhase("photos", { state: "running" });
        const next = [...photos];
        for (let i = 0; i < next.length; i++) {
          const staged = next[i]!;
          if (staged.uploaded) continue;
          try {
            const { blob, type } = await prepareImage(staged.file);
            const ext = type === "image/webp" ? "webp" : "jpg";
            const fd = new FormData();
            fd.set("property_id", propertyId);
            fd.set("file", new File([blob], `photo.${ext}`, { type }));
            const res = await uploadPropertyPhoto(fd);
            if (!res.ok) throw new Error(res.error ?? "uploadFailed");
            next[i] = { ...staged, uploaded: true };
          } catch (err) {
            // Stop here: the listing is NOT published, and the property is
            // kept so a retry only has to finish the uploads.
            setPhotos(next);
            updatePhase("photos", {
              state: "failed",
              done: next.filter((p) => p.uploaded).length,
            });
            setFormError(err instanceof Error ? err.message : "uploadFailed");
            setSubmitting(false);
            return;
          }
          setPhotos([...next]);
          updatePhase("photos", {
            done: next.filter((p) => p.uploaded).length,
          });
        }
        updatePhase("photos", { state: "done" });
      }

      // ── Phase 4 — publish ────────────────────────────────────────────────
      updatePhase("publish", { state: "running" });
      const res = listing
        ? await updatePostListing(
            listingFormData(values, propertyId, listing.id),
          )
        : await publishNewListing(listingFormData(values, propertyId));
      if (!res.ok) {
        updatePhase("publish", { state: "failed" });
        setFormError(res.error);
        setSubmitting(false);
        return;
      }
      updatePhase("publish", { state: "done" });

      // The public page the renter sees — proof the post is genuinely live.
      router.push(`/listings/${res.id}`);
    } catch {
      setFormError("errorGeneric");
      setSubmitting(false);
    }
  }

  // A retry after a photo failure has a property already; say so, and relabel.
  const retrying = mode === "create" && createdPropertyId !== null;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="flex max-w-2xl flex-col gap-10"
    >
      {formError ? (
        <Alert variant="danger">
          {message(formError)}
          {retrying ? ` ${t("partialFailure")}` : ""}
        </Alert>
      ) : null}

      {/* ── 1. Contact ── shown only when the profile cannot satisfy CT001 ── */}
      {needsContact ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-h2 text-ink">{t("contactTitle")}</h2>
            <p className="text-small text-ink-secondary">{tProfile("help")}</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{tProfile("fullNameLabel")}</span>
            <Input
              name="full_name"
              value={values.full_name}
              aria-invalid={invalid("full_name")}
              onChange={(e) => set("full_name", e.target.value)}
            />
            {fieldMsg("full_name")}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{tProfile("phoneLabel")}</span>
            <Input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={values.phone}
              aria-invalid={invalid("phone")}
              onChange={(e) => set("phone", e.target.value)}
            />
            {fieldMsg("phone")}
            <span className="text-caption text-ink-muted">
              {tProfile("phoneHelp")}
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{tProfile("telegramLabel")}</span>
            <Input
              name="telegram_username"
              value={values.telegram_username}
              aria-invalid={invalid("telegram_username")}
              onChange={(e) => set("telegram_username", e.target.value)}
            />
            {fieldMsg("telegram_username")}
            <span className="text-caption text-ink-muted">
              {tProfile("telegramHelp")}
            </span>
          </label>
        </section>
      ) : null}

      {/* ── 2. Location ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-h2 text-ink">{t("locationTitle")}</h2>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{tProperty("regionLabel")}</span>
          <Select
            name="region_id"
            value={values.region_id}
            aria-invalid={invalid("region_id")}
            onChange={(e) => {
              set(
                "region_id",
                e.target.value === "" ? "" : Number(e.target.value),
              );
              set("district_id", "");
            }}
          >
            <option value="" disabled>
              {tProperty("regionPlaceholder")}
            </option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {label(r)}
              </option>
            ))}
          </Select>
          {fieldMsg("region_id")}
        </label>

        {showDistricts ? (
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{tProperty("districtLabel")}</span>
            <Select
              name="district_id"
              value={values.district_id}
              aria-invalid={invalid("district_id")}
              onChange={(e) =>
                set(
                  "district_id",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            >
              <option value="" disabled>
                {tProperty("districtPlaceholder")}
              </option>
              {districtOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {label(d)}
                </option>
              ))}
            </Select>
            {fieldMsg("district_id")}
          </label>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{tProperty("addressLabel")}</span>
          <Input
            name="address_line"
            value={values.address_line}
            aria-invalid={invalid("address_line")}
            onChange={(e) => set("address_line", e.target.value)}
          />
          {fieldMsg("address_line")}
        </label>

        <div className="flex flex-col gap-1.5">
          <MapPicker
            locale={locale}
            value={
              values.latitude !== null && values.longitude !== null
                ? { latitude: values.latitude, longitude: values.longitude }
                : null
            }
            onChange={(c: Coordinate) => {
              set("latitude", c.latitude);
              set("longitude", c.longitude);
            }}
          />
          {fieldMsg("location")}
          {fieldMsg("latitude")}
        </div>
      </section>

      {/* ── 3. Photos ── staged on create, immediate on edit ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-h2 text-ink">{t("photosTitle")}</h2>
        {mode === "edit" ? (
          photoSlot
        ) : (
          <PhotoStaging
            photos={photos}
            onChange={setPhotos}
            disabled={submitting}
          />
        )}
        {fieldMsg("photos")}
      </section>

      {/* ── 4. Details ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-h2 text-ink">{t("detailsTitle")}</h2>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{tListing("title")}</span>
          <Input
            name="title"
            maxLength={120}
            value={values.title}
            aria-invalid={invalid("title")}
            onChange={(e) => set("title", e.target.value)}
          />
          {fieldMsg("title")}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{tListing("description")}</span>
          <Textarea
            name="description"
            maxLength={3000}
            rows={4}
            value={values.description}
            aria-invalid={invalid("description")}
            onChange={(e) => set("description", e.target.value)}
          />
          {fieldMsg("description")}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{tListing("language")}</span>
          <Select
            name="content_language"
            value={values.content_language}
            onChange={(e) => set("content_language", e.target.value)}
          >
            <option value="uz">{tListing("langUz")}</option>
            <option value="ru">{tListing("langRu")}</option>
          </Select>
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={fieldLabel}>{tListing("price")}</span>
            <Input
              name="price_amount"
              type="number"
              min="1"
              step="0.01"
              value={values.price_amount}
              aria-invalid={invalid("price_amount")}
              onChange={(e) => set("price_amount", e.target.value)}
            />
            {fieldMsg("price_amount")}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{tListing("currency")}</span>
            <Select
              name="price_currency"
              value={values.price_currency}
              onChange={(e) => set("price_currency", e.target.value)}
            >
              <option value="UZS">UZS</option>
              <option value="USD">USD</option>
            </Select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{tListing("rentalPeriod")}</span>
          <Select
            name="rental_period"
            value={values.rental_period}
            onChange={(e) => set("rental_period", e.target.value)}
          >
            <option value="monthly">{tListing("periodMonthly")}</option>
            <option value="daily">{tListing("periodDaily")}</option>
          </Select>
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={fieldLabel}>{tListing("rooms")}</span>
            <Input
              name="rooms"
              type="number"
              min="1"
              max="20"
              value={values.rooms}
              aria-invalid={invalid("rooms")}
              onChange={(e) => set("rooms", e.target.value)}
            />
            {fieldMsg("rooms")}
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={fieldLabel}>{tListing("area")}</span>
            <Input
              name="area_sqm"
              type="number"
              min="0"
              step="0.01"
              value={values.area_sqm}
              aria-invalid={invalid("area_sqm")}
              onChange={(e) => set("area_sqm", e.target.value)}
            />
            {fieldMsg("area_sqm")}
          </label>
        </div>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={fieldLabel}>{tListing("floor")}</span>
            <Input
              name="floor"
              type="number"
              value={values.floor}
              aria-invalid={invalid("floor")}
              onChange={(e) => set("floor", e.target.value)}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={fieldLabel}>{tListing("totalFloors")}</span>
            <Input
              name="total_floors"
              type="number"
              min="1"
              value={values.total_floors}
              aria-invalid={invalid("total_floors")}
              onChange={(e) => set("total_floors", e.target.value)}
            />
          </label>
        </div>
        {fieldMsg("floor")}
        {fieldMsg("total_floors")}

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{tListing("availableFrom")}</span>
          <Input
            name="available_from"
            type="date"
            value={values.available_from}
            aria-invalid={invalid("available_from")}
            onChange={(e) => set("available_from", e.target.value)}
          />
          {fieldMsg("available_from")}
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className={fieldLabel}>{tListing("amenities")}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {amenities.map((a) => (
              <label
                key={a.id}
                className="flex min-h-11 cursor-pointer items-center gap-2"
              >
                <Checkbox
                  checked={values.amenity_ids.includes(a.id)}
                  onChange={(e) =>
                    set(
                      "amenity_ids",
                      e.target.checked
                        ? [...values.amenity_ids, a.id]
                        : values.amenity_ids.filter((id) => id !== a.id),
                    )
                  }
                />
                <span className="text-body text-ink">{label(a)}</span>
              </label>
            ))}
          </div>
          {fieldMsg("amenity_ids")}
        </fieldset>
      </section>

      {phases ? <SubmitProgress phases={phases} /> : null}

      <Button type="submit" loading={submitting} className="self-start">
        {retrying && formError ? t("retry") : t("submit")}
      </Button>
    </form>
  );
}

// Contact and property errors come back as a single key; attach each to the
// field it belongs to so the message lands next to the input.
function contactField(key: string | undefined): string {
  if (key === "phoneInvalid" || key === "phoneTaken") return "phone";
  if (key === "telegramInvalid") return "telegram_username";
  return "full_name";
}

function propertyField(key: string): string {
  if (key === "districtRequired") return "district_id";
  if (key === "addressInvalid") return "address_line";
  if (key === "locationRequired" || key === "locationOutOfBounds")
    return "location";
  return "region_id";
}
