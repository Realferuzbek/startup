// Client-side image preparation, run in the browser BEFORE any bytes are sent.
// This is a UX and bandwidth optimization ONLY — NOT a security control. The
// server re-validates every upload independently (magic bytes, size, count).

const MAX_EDGE = 1920;
const TARGET_BYTES = 800 * 1024;

export type PreparedImage = { blob: Blob; type: string };

export async function prepareImage(file: File): Promise<PreparedImage> {
  // Reject anything that isn't a real raster image before doing any work.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("notImage");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("notImage");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Prefer WebP; fall back to JPEG when the browser can't encode WebP (in which
  // case toBlob silently returns PNG, so we detect the type mismatch and skip).
  for (const type of ["image/webp", "image/jpeg"]) {
    for (const quality of [0.82, 0.7, 0.6, 0.5]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, type, quality),
      );
      if (!blob || blob.type !== type) break;
      if (blob.size <= TARGET_BYTES || quality === 0.5) {
        return { blob, type };
      }
    }
  }

  throw new Error("notImage");
}
