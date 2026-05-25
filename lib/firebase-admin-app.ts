import { cert, getApps, initializeApp } from "firebase-admin/app";
import type { App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

type Cached = Firestore | null | undefined;
let cached: Cached = undefined;

/**
 * Reads `FIREBASE_SERVICE_ACCOUNT_JSON` (full JSON for a Firebase service account).
 * Returns Firestore handle or null when unset / invalid (audit still runs).
 */
export async function getAdminFirestoreDb(): Promise<Firestore | null> {
  if (cached !== undefined) {
    return cached;
  }

  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!rawJson) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[audit] FIREBASE_SERVICE_ACCOUNT_JSON unset — skipping Firestore lead capture.",
      );
    }
    cached = null;
    return null;
  }

  try {
    const credentials = JSON.parse(rawJson) as Record<string, unknown>;
    const app: App =
      getApps()[0] ??
      initializeApp({
        credential: cert(credentials as Parameters<typeof cert>[0]),
      });

    const db = getFirestore(app);
    cached = db;
    return db;
  } catch (e) {
    console.error("[audit] Firebase Admin init failed:", e);
    cached = null;
    return null;
  }
}
