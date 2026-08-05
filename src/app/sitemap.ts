import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import { getPublicListingIds } from "@/features/discovery/queries";

async function localized(href: string) {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = SITE_URL + (await getPathname({ locale: l, href }));
  }
  return {
    url:
      SITE_URL + (await getPathname({ locale: routing.defaultLocale, href })),
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // The locale root is the feed; there is no separate browse URL any more.
  entries.push({ ...(await localized("/")), lastModified: new Date() });

  for (const l of await getPublicListingIds()) {
    entries.push({
      ...(await localized(`/listings/${l.id}`)),
      lastModified: new Date(l.updated_at),
    });
  }

  return entries;
}
