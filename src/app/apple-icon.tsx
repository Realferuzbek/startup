import { ImageResponse } from "next/og";

// iOS home-screen icon. `apple-icon.svg` is not a supported extension — the
// convention takes .jpg/.jpeg/.png or a generated route like this one — so the
// same filled mark is rasterized to PNG at the size iOS asks for. No background
// transparency: iOS composites home-screen icons on an unknown wallpaper.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const STAR =
  "M12 2 L14.92893 4.92893 L19.07107 4.92893 L19.07107 9.07107 L22 12 " +
  "L19.07107 14.92893 L19.07107 19.07107 L14.92893 19.07107 L12 22 " +
  "L9.07107 19.07107 L4.92893 19.07107 L4.92893 14.92893 L2 12 " +
  "L4.92893 9.07107 L4.92893 4.92893 L9.07107 4.92893 Z";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1b4b8f",
      }}
    >
      <svg width="132" height="132" viewBox="0 0 24 24" fill="#ffffff">
        <path d={STAR} />
      </svg>
    </div>,
    size,
  );
}
