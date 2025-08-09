import { initializeApp as initializeAdminApp, getApps, cert, type App } from "firebase-admin/app"
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore"
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth"
import { getStorage } from "firebase-admin/storage"

/**
 * Initialise the Firebase Admin SDK exactly once (avoids double-init in
 * serverless / hot-reload scenarios).
 * All logic calling `auth` / `db` must import from this file.
 */
export function initializeFirebaseAdmin(): App {
  if (getApps().length > 0) {
    console.log("✅ [Firebase Admin] Using existing app instance.")
    return getApps()[0] as App
  }

  console.log("🔄 [Firebase Admin] Initializing new app instance...")

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    const errorMessage =
      "❌ [Firebase Admin] Missing required environment variables. " +
      "Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set."
    console.error(errorMessage)
    throw new Error(errorMessage)
  }

  try {
    // The private key from environment variables needs newlines to be correctly parsed.
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")

    const app = initializeAdminApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      projectId: FIREBASE_PROJECT_ID,
    })

    console.log("✅ [Firebase Admin] Initialization successful.")
    return app
  } catch (error: any) {
    console.error("❌ [Firebase Admin] Initialization failed:", error.message)
    throw new Error(`Firebase Admin initialization failed: ${error.message}`)
  }
}

// Initialize the app
const adminApp = initializeFirebaseAdmin()

// --- EXPORTS ---
// The following exports are structured to satisfy all dependencies across the project.

// Core services
const adminDbService: Firestore = getFirestore(adminApp)
const adminAuthService: Auth = getAuth(adminApp)
const adminStorageService = getStorage(adminApp)

// Export with modern names
export const adminDb = adminDbService
export const adminAuth = adminAuthService
export const adminStorage = adminStorageService

// Export with legacy/aliased names to ensure backward compatibility
export const db = adminDbService
export const firestore = adminDbService
export const auth = adminAuthService

// Re-export FieldValue for convenience
export { FieldValue }

// Legacy export object for backward compatibility
export const firebaseDb = {
  auth: () => adminAuthService,
  firestore: () => adminDbService,
  storage: () => adminStorageService,
}

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
      console.error(`❌ [Firestore] Attempt ${attempt} failed:`, err)

      if (attempt < maxRetries) {
        console.log(`🔄 [Firestore] Retrying in ${delay}ms...`)
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
  try {
    console.log("🔄 [Auth] Verifying Firebase ID token")
    const decodedToken = await adminAuthService.verifyIdToken(idToken)
    console.log(`✅ [Auth] Token verified for user: ${decodedToken.uid}`)
    return decodedToken
  } catch (error: any) {
    console.error(`❌ [Auth] Token verification failed: ${error.message}`)
    throw error
  }
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
    console.error("❌ [Auth] Missing Bearer token in authorization header")
    throw new Error("Missing Bearer token")
  }

  const token = authHeader.slice(7)
  try {
    const decoded = await verifyIdToken(token)
    console.log(`✅ [Auth] Authenticated user: ${decoded.uid} (${decoded.email || "no email"})`)
    return { uid: decoded.uid, email: decoded.email }
  } catch (error) {
    console.error("❌ [Auth] Failed to authenticate user:", error)
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Example helper used elsewhere in the codebase to upsert a user profile.
 */
export async function createOrUpdateUserProfile(userId: string, profileData: Record<string, unknown>) {
  return withRetry(async () => {
    const ref = adminDbService.collection("users").doc(userId)
    const now = new Date()

    try {
      const docSnapshot = await ref.get()

      if (docSnapshot.exists) {
        console.log(`🔄 [Firestore] Updating user profile for ${userId}`)
        await ref.update({ ...profileData, updatedAt: now })
      } else {
        console.log(`🔄 [Firestore] Creating new user profile for ${userId}`)
        await ref.set({ ...profileData, createdAt: now, updatedAt: now })
      }

      console.log(`✅ [Firestore] User profile saved for ${userId}`)
      return ref.id
    } catch (error) {
      console.error(`❌ [Firestore] Failed to save user profile for ${userId}:`, error)
      throw error
    }
  })
}
