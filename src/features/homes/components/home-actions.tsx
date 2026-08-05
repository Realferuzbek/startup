"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { publishListing, pauseListing } from "@/features/listings/actions";
import type { ListingFormState } from "@/features/listings/schema";
import { Button, buttonVariants } from "@/components/ui/button";
import { DeletePropertyButton } from "@/features/properties/components/delete-property-button";
import type { HomeState } from "../state";

const initial: ListingFormState = { status: "idle" };

// State-specific actions for a home card. Publish/resume/republish are all the
// one publishListing action (label differs by state); pause is pauseListing;
// delete is the property delete (which refuses when listing history exists).
// An incomplete home offers only the two things worth doing to it: finish it in
// the post form, or remove it. Nothing is ever silently disabled.
export function HomeActions({
  state,
  propertyId,
  listingId,
}: {
  state: HomeState;
  propertyId: string;
  listingId: string | null;
}) {
  const t = useTranslations("homes");
  const tl = useTranslations("listing");
  const tp = useTranslations("photo");

  const [pubState, publishAction, publishing] = useActionState(
    publishListing,
    initial,
  );
  const [pauseState, pauseAction, pausing] = useActionState(
    pauseListing,
    initial,
  );

  const error =
    (pubState.status === "error" && pubState.error) ||
    (pauseState.status === "error" && pauseState.error) ||
    null;

  // Editing is keyed by property: one form covers the home and its offer.
  const editHref = `/edit/${propertyId}`;

  const publishForm = (label: string) => (
    <form action={publishAction}>
      <input type="hidden" name="id" value={listingId ?? ""} />
      <Button type="submit" size="sm" loading={publishing}>
        {label}
      </Button>
    </form>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {state === "incomplete" ? (
          <>
            <Link
              href={editHref}
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              {t("finish")}
            </Link>
            <DeletePropertyButton id={propertyId} />
          </>
        ) : (
          <Link
            href={editHref}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            {t("edit")}
          </Link>
        )}

        {state === "live" && listingId ? (
          <>
            <form action={pauseAction}>
              <input type="hidden" name="id" value={listingId} />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                loading={pausing}
              >
                {t("pause")}
              </Button>
            </form>
            <Link
              href={`/listings/${listingId}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {t("viewPublicly")}
            </Link>
          </>
        ) : null}

        {state === "paused" && listingId ? (
          <>
            {publishForm(t("resume"))}
            <DeletePropertyButton id={propertyId} />
          </>
        ) : null}

        {state === "expired" && listingId ? (
          <>
            {publishForm(t("republish"))}
            <DeletePropertyButton id={propertyId} />
          </>
        ) : null}
      </div>

      {error === "contactRequired" ? (
        <span role="alert" className="text-caption text-danger">
          {tl("contactRequired")}{" "}
          <Link
            href="/profile#sozlamalar"
            className="rounded-sm underline focus-visible:ring-2 focus-visible:ring-registry/40 focus-visible:outline-none"
          >
            {tl("contactRequiredLink")}
          </Link>
        </span>
      ) : error ? (
        <span role="alert" className="text-caption text-danger">
          {error === "needsPhotos" ? tp("cannotPublish") : tl(error)}
        </span>
      ) : null}
    </div>
  );
}
