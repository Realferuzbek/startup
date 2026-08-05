// Absolute site origin for SEO (canonical URLs, hreflang alternates, sitemap).
// Set NEXT_PUBLIC_SITE_URL in production; falls back to localhost in dev.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");
