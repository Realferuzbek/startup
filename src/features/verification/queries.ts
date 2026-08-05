import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getGeographyOptions } from "@/features/properties/queries";
import type { Database } from "@/types/database";

const BUCKET = "verification-documents";
const SIGNED_URL_TTL = 300; // 5 minutes — long enough to review, short enough.

type RejectionReason =
  Database["public"]["Enums"]["verification_rejection_reason"];

export type AdminOverview = {
  properties: number;
  liveListings: number;
  pendingVerifications: number;
};

export type QueueItem = {
  id: string;
  createdAt: string;
  hostName: string | null;
  addressLine: string;
  regionName: string;
  districtName: string | null;
};

export type VerificationDetail = {
  id: string;
  createdAt: string;
  status: Database["public"]["Enums"]["verification_submission_status"];
  cadastralNumber: string;
  rejectionReason: RejectionReason | null;
  rejectionNote: string | null;
  hostName: string | null;
  addressLine: string;
  regionName: string;
  districtName: string | null;
  documentUrl: string | null;
  isPdf: boolean;
};

// Localized name resolver shared by the queue and detail views.
async function nameResolvers(locale: string) {
  const geo = await getGeographyOptions();
  const label = (o: { name_uz: string; name_ru: string }) =>
    locale === "ru" ? o.name_ru : o.name_uz;
  return {
    regionName: (id: number | null) => {
      const r = geo.regions.find((x) => x.id === id);
      return r ? label(r) : "";
    },
    districtName: (id: number | null) => {
      if (id == null) return null;
      const d = geo.districts.find((x) => x.id === id);
      return d ? label(d) : null;
    },
  };
}

// Overview counts for the admin landing. All three read through admin RLS
// (properties_admin_all / listings_admin_all / the verification admin policy)
// on the caller's session — the service role is never involved.
export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [properties, liveListings, pendingVerifications] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
    supabase
      .from("property_verifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return {
    properties: properties.count ?? 0,
    liveListings: liveListings.count ?? 0,
    pendingVerifications: pendingVerifications.count ?? 0,
  };
}

// The pending queue, oldest first (first-come, first-served review).
export async function getVerificationQueue(
  locale: string,
): Promise<QueueItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("property_verifications")
    .select(
      "id, created_at, properties!property_id(address_line, region_id, district_id), submitter:profiles!submitted_by(full_name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const { regionName, districtName } = await nameResolvers(locale);

  return (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    hostName: row.submitter?.full_name ?? null,
    addressLine: row.properties?.address_line ?? "",
    regionName: regionName(row.properties?.region_id ?? null),
    districtName: districtName(row.properties?.district_id ?? null),
  }));
}

// One submission, with a short-lived signed URL to its document. The admin
// SELECT storage policy authorizes the signing against the caller's session.
export async function getVerificationDetail(
  id: string,
  locale: string,
): Promise<VerificationDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("property_verifications")
    .select(
      "id, created_at, status, cadastral_number, rejection_reason, rejection_note, document_path, properties!property_id(address_line, region_id, district_id), submitter:profiles!submitted_by(full_name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const { regionName, districtName } = await nameResolvers(locale);

  let documentUrl: string | null = null;
  const path = data.document_path;
  if (path) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);
    documentUrl = signed?.signedUrl ?? null;
  }

  return {
    id: data.id,
    createdAt: data.created_at,
    status: data.status,
    cadastralNumber: data.cadastral_number,
    rejectionReason: data.rejection_reason,
    rejectionNote: data.rejection_note,
    hostName: data.submitter?.full_name ?? null,
    addressLine: data.properties?.address_line ?? "",
    regionName: regionName(data.properties?.region_id ?? null),
    districtName: districtName(data.properties?.district_id ?? null),
    documentUrl,
    isPdf: Boolean(path && path.toLowerCase().endsWith(".pdf")),
  };
}
