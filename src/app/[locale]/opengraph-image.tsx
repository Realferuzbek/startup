import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

// Share card for every route under [locale]. Next 16 passes `params` as a
// Promise to image-generating functions, so it must be awaited.
export const alt = "Makleer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STAR =
  "M12 2 L14.92893 4.92893 L19.07107 4.92893 L19.07107 9.07107 L22 12 " +
  "L19.07107 14.92893 L19.07107 19.07107 L14.92893 19.07107 L12 22 " +
  "L9.07107 19.07107 L4.92893 19.07107 L4.92893 14.92893 L2 12 " +
  "L4.92893 9.07107 L4.92893 4.92893 L9.07107 4.92893 Z";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 28,
        padding: "0 96px",
        background: "#f7f8fa",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <svg width="120" height="120" viewBox="0 0 24 24" fill="#1b4b8f">
          <path d={STAR} />
        </svg>
        <span
          style={{
            fontSize: 116,
            fontWeight: 600,
            color: "#0f1720",
            letterSpacing: "-0.02em",
          }}
        >
          Makleer
        </span>
      </div>
      <span style={{ fontSize: 40, color: "#4a5561", maxWidth: 900 }}>
        {t("metaDescription")}
      </span>
    </div>,
    size,
  );
}
