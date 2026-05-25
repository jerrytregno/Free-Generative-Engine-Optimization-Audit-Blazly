import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestoreDb } from "./firebase-admin-app";

export type AuditLeadPayload = {
  email: string;
  websiteUrl: string;
  normalizedWebsiteOrigin: string;
};

/**
 * Best-effort: skips if Firebase Admin credentials are unset.
 */
export async function persistAuditLead(input: AuditLeadPayload): Promise<void> {
  const db = await getAdminFirestoreDb();
  if (!db) return;

  await db.collection("audit_leads").add({
    email: input.email.trim().toLowerCase(),
    websiteUrl: input.websiteUrl.trim(),
    normalizedWebsiteOrigin: input.normalizedWebsiteOrigin,
    createdAt: FieldValue.serverTimestamp(),
  });
}
