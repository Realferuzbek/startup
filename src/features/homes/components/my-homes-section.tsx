import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getOwnerHomes } from "@/features/homes/queries";
import { HomeCard } from "@/features/homes/components/home-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";

// "Uylarim" — the user's own homes, each a property plus its current listing
// collapsed into one card with a state. Self-contained so the profile page can
// grow a public-makler header above it without touching this block.
export async function MyHomesSection({
  userId,
  locale,
}: {
  userId: string;
  locale: string;
}) {
  const t = await getTranslations("homes");
  const tn = await getTranslations("nav");
  const homes = await getOwnerHomes(userId, locale);

  return (
    <section aria-labelledby="uylarim" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="uylarim" className="text-h2 text-ink">
          {t("title")}
        </h2>
        {homes.length > 0 ? (
          <Link
            href="/post"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            {tn("post")}
          </Link>
        ) : null}
      </div>

      {homes.length === 0 ? (
        <EmptyState
          heading={t("emptyTitle")}
          body={t("emptyBody")}
          action={
            <Link
              href="/post"
              className={buttonVariants({ variant: "primary" })}
            >
              {tn("post")}
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {homes.map((home) => (
            <HomeCard key={home.propertyId} home={home} locale={locale} />
          ))}
        </div>
      )}
    </section>
  );
}
