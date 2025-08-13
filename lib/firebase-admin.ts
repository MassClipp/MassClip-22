import type { App } from "firebase-admin/app"
import { getApps, cert } from "firebase-admin/app"
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore"
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth"
import { getStorage, type Storage } from "firebase-admin/storage"
import admin from "firebase-admin"

let adminApp: App | null = null
let adminDb: Firestore | null = null
let auth: Auth | null = null
let storage: Storage | null = null

/**
 * Initializes the Firebase Admin SDK, ensuring it only runs once.
 * This function is exported because other modules in your project depend on it.
 * @returns The initialized Firebase Admin App instance.
 */
export function initializeFirebaseAdmin(): App {
  if (adminApp && getApps().length > 0) {
    console.log("✅ [Firebase Admin] Already initialized, returning existing app")
    return adminApp
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.error("❌ [Firebase Admin] CRITICAL: Missing Firebase Admin credentials.")
    console.error("Missing:", {
      FIREBASE_PROJECT_ID: !!FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!FIREBASE_PRIVATE_KEY,
    })
    throw new Error("Missing Firebase Admin credentials in environment variables.")
  }

  try {
    console.log("🔄 [Firebase Admin] Initializing Firebase Admin SDK...")
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")

    adminApp = admin.initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      projectId: FIREBASE_PROJECT_ID,
    })

    // Initialize services
    adminDb = getFirestore(adminApp)
    auth = getAuth(adminApp)
    storage = getStorage(adminApp)

    console.log("✅ [Firebase Admin] Firebase Admin SDK initialized successfully.")
    console.log(`📊 [Firebase Admin] Project ID: ${FIREBASE_PROJECT_ID}`)

    return adminApp
  } catch (error) {
    console.error("❌ [Firebase Admin] CRITICAL: Firebase Admin SDK initialization failed.", error)
    throw new Error(`Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Initialize immediately
try {
  initializeFirebaseAdmin()
} catch (error) {
  console.error("❌ [Firebase Admin] Failed to initialize on module load:", error)
}

// Export a utility function to check the initialization status.
export const isFirebaseAdminInitialized = () => {
  return !!adminApp && !!adminDb && getApps().length > 0
}

// Export Firestore, Auth, and Storage instances with getters that ensure initialization
export const getAdminDb = (): Firestore => {
  if (!adminDb) {
    console.log("🔄 [Firebase Admin] adminDb not ready, initializing...")
    initializeFirebaseAdmin()
  }
  if (!adminDb) {
    throw new Error("Firebase Admin Firestore not initialized")
  }
  return adminDb
}

export const getAdminAuth = (): Auth => {
  if (!auth) {
    console.log("🔄 [Firebase Admin] auth not ready, initializing...")
    initializeFirebaseAdmin()
  }
  if (!auth) {
    throw new Error("Firebase Admin Auth not initialized")
  }
  return auth
}

export const getAdminStorage = (): Storage => {
  if (!storage) {
    console.log("🔄 [Firebase Admin] storage not ready, initializing...")
    initializeFirebaseAdmin()
  }
  if (!storage) {
    throw new Error("Firebase Admin Storage not initialized")
  }
  return storage
}

// Direct exports (with fallback initialization)
export { adminDb, auth, storage }

// Aliases for backward compatibility
export const adminAuth = auth
export const firestore = adminDb
export const db = adminDb

export const firebaseAdmin = {
  auth: () => getAdminAuth(),
  firestore: () => getAdminDb(),
  storage: () => getAdminStorage(),
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
  const authInstance = getAdminAuth()
  try {
    return await authInstance.verifyIdToken(idToken)
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
  const db = getAdminDb()
  const ref = db.collection("users").doc(userId)
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
