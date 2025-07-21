import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore"
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth"

/* -------------------------------------------------------------------------- */
/*                              App initialisation                            */
/* -------------------------------------------------------------------------- */

/**
 * Initialise the Firebase Admin SDK exactly once (avoids double-init in
 * serverless / hot-reload scenarios).
 * All logic calling `auth` / `db` must import from this file.
 */
let app: App

if (!getApps().length) {
  try {
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
    console.log("✅ Firebase Admin initialized successfully")
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error)
    throw error
  }
} else {
  app = getApps()[0]
}

export const db: Firestore = getFirestore(app)
export const auth: Auth = getAuth(app)

// Recommended for better Firestore reliability
db.settings({ ignoreUndefinedProperties: true })

/* -------------------------------------------------------------------------- */
/*                             Lazy loaded singletons                         */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                                 Utilities                                  */
/* -------------------------------------------------------------------------- */

/**
 * Generic retry helper with exponential back-off – useful for flaky Firestore
 * operations.
 */
export async function withRetry<T>(op: () => Promise<T>, maxRetries = 3, delay = 1_000): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await op()
    } catch (err) {
      lastError = err
      console.error(`❌ Firestore attempt ${attempt} failed`, err)

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delay))
        delay *= 2 // exponential back-off
      }
    }
  }

  throw lastError
}

/**
 * Verify a Firebase ID token and return its decoded contents.
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  return auth.verifyIdToken(idToken)
}

/**
 * Extract the authenticated user (uid/email) from HTTP request headers.
 * Works with both `fetch` `Headers` and a simple key/value map.
 */
export async function getAuthenticatedUser(
  headers: Headers | Record<string, string>,
): Promise<{ uid: string; email?: string }> {
  const get = (key: string) => (headers instanceof Headers ? headers.get(key) : headers[key])

  const authHeader = get("authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token")
  }

  const token = authHeader.slice(7)
  const decoded = await verifyIdToken(token)

  return { uid: decoded.uid, email: decoded.email }
}

/**
 * Example helper used elsewhere in the codebase to upsert a user profile.
 */
export async function createOrUpdateUserProfile(userId: string, profileData: Record<string, unknown>) {
  return withRetry(async () => {
    const ref = db.collection("users").doc(userId)
    const now = new Date()

    if ((await ref.get()).exists) {
      await ref.update({ ...profileData, updatedAt: now })
    } else {
      await ref.set({ ...profileData, createdAt: now, updatedAt: now })
    }

    return ref.id
  })
}

/* -------------------------------------------------------------------------- */
/*                           Re-export Firestore types                        */
/* -------------------------------------------------------------------------- */

export { FieldValue }
export { app }
