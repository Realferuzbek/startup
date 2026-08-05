import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The authenticated surfaces, auth flows, and the internal design
        // preview are not for indexing. /*/dashboard stays listed because the
        // old paths still resolve — as redirects.
        disallow: [
          "/*/profile",
          "/*/post",
          "/*/edit",
          "/*/verify",
          "/*/admin",
          "/*/dashboard",
          "/*/login",
          "/*/auth/",
          "/*/not-authorized",
          "/*/design",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
