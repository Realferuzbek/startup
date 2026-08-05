import "server-only";

import sharp from "sharp";

// Perceptual hash (dHash): reduce to a 9x8 grayscale image, then for each of the
// 8 rows compare the 8 adjacent-pixel pairs → 64 bits → 16 hex chars. Captured
// on every upload so it exists from day one; duplicate detection is NOT built in
// this chunk. Returns null on any failure — never a fabricated value.
export async function computePhash(bytes: Uint8Array): Promise<string | null> {
  try {
    const raw = await sharp(Buffer.from(bytes))
      .grayscale()
      .resize(9, 8, { fit: "fill" })
      .raw()
      .toBuffer();

    let bits = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const i = row * 9 + col;
        bits += raw[i]! < raw[i + 1]! ? "1" : "0";
      }
    }

    let hex = "";
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch {
    return null;
  }
}
