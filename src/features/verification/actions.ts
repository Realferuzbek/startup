"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, requireRole } from "@/features/auth/session";
import type { Database } from "@/types/database";
import { sniffDocumentType, extForDocMime } from "./magic-bytes";
import {
  submitVerificationSchema,
  type SubmitState,
  type DecideState,
} from "./schema";

const BUCKET = "verification-documents";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — matches the bucket limit.

type RejectionReason =
  Database["public"]["Enums"]["verification_rejection_reason"];

const REJECTION_REASONS: readonly RejectionReason[] = [
  "name_mismatch",
  "unreadable",
  "wrong_document",
  "cadastral_mismatch",
  "other",
];

// Host submits ownership proof for a property they own. THE upload boundary:
// the document is re-validated by magic bytes and size server-side, uploaded
// with the caller's session (Storage RLS authorizes the write — never the
// service role), then the submit_verification RPC atomically records the
// submission and moves the property to `pending`. A failed submission removes
// the just-uploaded object so no orphan is left behind.
export async function submitVerification(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const { user } = await requireUser();
  const supabase = await createClient();

  const parsed = submitVerificationSchema.safeParse({
    property_id: formData.get("property_id"),
    cadastral_number: formData.get("cadastral_number"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "errorGeneric",
    };
  }
  const { property_id, cadastral_number } = parsed.data;

  // Ownership pre-check (Storage RLS + the RPC's INVOKER context also enforce
  // it; this gives a clean error before any upload).
  const { data: owned } = await supabase
    .from("properties")
    .select("id")
    .eq("id", property_id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!owned) return { status: "error", error: "errorGeneric" };

  const file = formData.get("document");
  if (!(file instanceof File)) {
    return { status: "error", error: "documentRequired" };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) {
    return { status: "error", error: "documentRequired" };
  }
  if (bytes.byteLength > MAX_BYTES) {
    return { status: "error", error: "fileTooLarge" };
  }

  // Magic-byte validation — trust the bytes, not the extension/MIME. SVG never
  // matches, so it can never be accepted.
  const mime = sniffDocumentType(bytes);
  if (!mime) return { status: "error", error: "wrongFileType" };

  // Server-generated UUID path under the property segment (Storage RLS scopes
  // writes to the owner by this first path segment).
  const path = `${property_id}/${randomUUID()}.${extForDocMime(mime)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, Buffer.from(bytes), { contentType: mime, upsert: false });
  if (uploadError) return { status: "error", error: "uploadFailed" };

  const { error: rpcError } = await supabase.rpc("submit_verification", {
    p_property_id: property_id,
    p_cadastral_number: cadastral_number,
    p_document_path: path,
  });

  if (rpcError) {
    // The submission failed — remove the just-uploaded object (no orphan).
    await supabase.storage.from(BUCKET).remove([path]);
    // 23505 = the one-pending unique index; VF001 = property already verified.
    const error =
      rpcError.code === "23505"
        ? "alreadyPending"
        : rpcError.code === "VF001"
          ? "alreadyVerified"
          : "errorGeneric";
    return { status: "error", error };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/profile`);
  redirect(`/${locale}/profile?submitted=1`);
}

// Admin approves or rejects a pending submission. The decision (submission +
// property + clearing document_path) is applied atomically by decide_verification
// FIRST; it returns the old document path, which we then best-effort delete for
// retention. A failed byte-delete leaves an unreachable orphan (the path is
// already nulled, the bucket is private and non-enumerable) — never an
// accessible document, and the audit row always survives.
export async function decideVerification(
  _prev: DecideState,
  formData: FormData,
): Promise<DecideState> {
  await requireRole("admin");
  const supabase = await createClient();

  const verificationId = String(formData.get("verification_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const approve = decision === "approve";

  if (!verificationId) return { status: "error", error: "errorGeneric" };
  if (decision !== "approve" && decision !== "reject") {
    return { status: "error", error: "errorGeneric" };
  }

  let reason: RejectionReason | undefined;
  if (!approve) {
    const raw = String(formData.get("reason") ?? "");
    if (!REJECTION_REASONS.includes(raw as RejectionReason)) {
      return { status: "error", error: "reasonRequired" };
    }
    reason = raw as RejectionReason;
  }
  const note = String(formData.get("note") ?? "").trim() || undefined;

  const { data: oldPath, error } = await supabase.rpc("decide_verification", {
    p_verification_id: verificationId,
    p_approve: approve,
    p_reason: reason,
    p_note: note,
  });

  if (error) {
    // P0002 = no pending submission (already decided); 23514 = reason required.
    const key =
      error.code === "P0002"
        ? "notPending"
        : error.code === "23514"
          ? "reasonRequired"
          : "errorGeneric";
    return { status: "error", error: key };
  }

  // Retention: best-effort delete of the document bytes. The row is already
  // consistent regardless of whether this succeeds.
  if (oldPath) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove([oldPath]);
    if (removeError) {
      console.error(
        `verification ${verificationId}: document byte-delete failed for ${oldPath} — unreachable orphan left behind`,
      );
    }
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/admin/verifications`);
  redirect(`/${locale}/admin/verifications`);
}
