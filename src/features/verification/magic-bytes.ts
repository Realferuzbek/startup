// Server-side file-signature validation for verification DOCUMENTS. Same trust
// model as the photo pipeline: the declared MIME/extension is untrusted, only
// the bytes decide. Verification accepts the photo image types plus PDF (the
// usual format of a cadastral extract). SVG never matches at any layer.

import { sniffImageType } from "@/features/photos/magic-bytes";

export type DocumentMime =
  "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export function sniffDocumentType(bytes: Uint8Array): DocumentMime | null {
  const image = sniffImageType(bytes);
  if (image) return image;

  // PDF: 25 50 44 46 ("%PDF")
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }

  return null;
}

export function extForDocMime(mime: DocumentMime): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
  }
}
