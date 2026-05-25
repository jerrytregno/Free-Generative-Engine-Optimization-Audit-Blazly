/**
 * Firebase **Web App** SDK config — read from `.env.local` / host env via `NEXT_PUBLIC_*`.
 * Do not hardcode keys in source.
 */
export const firebasePublicConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
} as const;

export function isFirebasePublicConfigComplete(): boolean {
  return !!(
    firebasePublicConfig.apiKey &&
    firebasePublicConfig.projectId &&
    firebasePublicConfig.appId &&
    firebasePublicConfig.authDomain
  );
}
