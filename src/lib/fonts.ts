import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

// Self-hosted by next/font (no runtime request to Google). The `latin-ext`
// subset carries U+02BB — the Uzbek okina in `oʻ`/`gʻ`; without it the glyph
// silently substitutes. `cyrillic` covers Russian. Weights capped at 600 (never
// 700+ per the design system).
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-sans",
});

// Mono is used for numeric/identifier data: prices, areas, dates, cadastral and
// listing ids, and the verified label.
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});
