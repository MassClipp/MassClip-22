import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore, FieldValue } from "firebase-admin/firestore"
import { getAuth, type DecodedIdToken } from "firebase-admin/auth"

/**
 * Initialize the Firebase Admin SDK once (prevents double-init in serverless).
 */
export function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY

    if (!projectId || !clientEmail || !privateKeyRaw) {
      throw new Error(
        "Missing Firebase Admin credentials. " +
          "Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars are set.",
      )
    }

    const privateKey = privateKeyRaw.replace(/\\n/g, "\n")

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    })
    console.log("✅ Firebase Admin SDK initialised")
  }
  return getApps()[0]
}

/* -------------------------------------------------------------------------- */
/*                               Lazy singletons                              */
/* -------------------------------------------------------------------------- */

const adminApp = initializeFirebaseAdmin()
export const db = getFirestore(adminApp)
export const auth = getAuth(adminApp)

// Better reliability for Firestore
db.settings({ ignoreUndefinedProperties: true })

/* -------------------------------------------------------------------------- */
/*                          Utility / helper functions                        */
/* -------------------------------------------------------------------------- */

/**
 * Generic retry helper with exponential back-off – useful for flaky Firestore ops.
 */
export async function withRetry<T>(op: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
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
 * Verify a Firebase ID token and return decoded data.
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  return auth.verifyIdToken(idToken)
}

/**
 * Extract the authenticated user (uid/email) from request headers.
 */
export async function getAuthenticatedUser(headers: Headers): Promise<{ uid: string; email?: string }> {
  const authHeader = headers.get("authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token")
  }
  const token = authHeader.slice(7)
  const decoded = await verifyIdToken(token)
  return { uid: decoded.uid, email: decoded.email }
}

/* -------------------------------------------------------------------------- */
/*          Example helper that callers elsewhere in the codebase use         */
/* -------------------------------------------------------------------------- */

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

export { FieldValue }

// Alias export for compatibility with code expecting `adminDb`
export { db as adminDb }
