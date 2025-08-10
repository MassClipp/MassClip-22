import type { App } from "firebase-admin/app"
import { getApps, cert } from "firebase-admin/app"
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore"
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth"
import { getStorage, type Storage } from "firebase-admin/storage"
import admin from "firebase-admin"

/**
 * Initializes the Firebase Admin SDK, ensuring it only runs once.
 * This function is exported because other modules in your project depend on it.
 * @returns The initialized Firebase Admin App instance.
 */
export function initializeFirebaseAdmin(): App {
  if (getApps().length > 0 && getApps()[0]) {
    return getApps()[0]!
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.error("❌ [Firebase Admin] CRITICAL: Missing Firebase Admin credentials.")
    throw new Error("Missing Firebase Admin credentials in environment variables.")
  }

  try {
    console.log("🔄 [Firebase Admin] Initializing Firebase Admin SDK...")
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    const app = admin.initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      projectId: FIREBASE_PROJECT_ID,
    })
    console.log("✅ [Firebase Admin] Firebase Admin SDK initialized successfully.")
    return app
  } catch (error) {
    console.error("❌ [Firebase Admin] CRITICAL: Firebase Admin SDK initialization failed.", error)
    throw new Error(`Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

const adminApp = initializeFirebaseAdmin()

// Export a utility function to check the initialization status.
export const isFirebaseAdminInitialized = () => !!adminApp && getApps().length > 0

// Export Firestore, Auth, and Storage instances.
export const adminDb: Firestore = getFirestore(adminApp)
export const auth: Auth = getAuth(adminApp)
export const storage: Storage = getStorage(adminApp)

// Aliases for backward compatibility and consistent naming.
export const adminAuth = auth
export const firestore = adminDb
export const db = adminDb
export const firebaseAdmin = {
  auth: () => auth,
  firestore: () => adminDb,
  storage: () => storage,
  app: () => adminApp,
}

export default adminApp

/**
 * Generic retry helper with exponential back-off, used elsewhere in the project.
 */
export async function withRetry<T>(op: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
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
        delay *= 2 // Exponential back-off
      }
    }
  }
  throw lastError
}

/**
 * Verifies a Firebase ID token.
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  if (!isFirebaseAdminInitialized()) {
    throw new Error("Firebase Admin SDK is not initialized. Cannot verify ID token.")
  }
  try {
    return await auth.verifyIdToken(idToken)
  } catch (error: any) {
    console.error(`❌ [Auth] Token verification failed: ${error.message}`)
    throw error
  }
}

/**
 * Gets the authenticated user from request headers.
 */
export async function getAuthenticatedUser(
  headers: Headers | Record<string, string>,
): Promise<{ uid: string; email?: string }> {
  const getHeader = (key: string) => (headers instanceof Headers ? headers.get(key) : headers[key])
  const authHeader = getHeader("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header.")
  }

  const token = authHeader.substring(7)
  const decoded = await verifyIdToken(token)
  return { uid: decoded.uid, email: decoded.email }
}

/**
 * Creates or updates a user profile in Firestore.
 */
export async function createOrUpdateUserProfile(userId: string, profileData: Record<string, unknown>) {
  if (!isFirebaseAdminInitialized()) {
    throw new Error("Firebase Admin SDK is not initialized. Cannot update profile.")
  }
  const ref = adminDb.collection("users").doc(userId)
  const now = FieldValue.serverTimestamp()

  return withRetry(async () => {
    const doc = await ref.get()
    if (doc.exists) {
      await ref.update({ ...profileData, updatedAt: now })
    } else {
      await ref.set({ ...profileData, createdAt: now, updatedAt: now }, { merge: true })
    }
  })
}

export { FieldValue }
