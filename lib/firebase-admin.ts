import { initializeApp as initializeAdminApp, getApps, cert, type App } from "firebase-admin/app"
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore"
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth"
import { getStorage } from "firebase-admin/storage"
import admin from "firebase-admin"

/**
 * Initialise the Firebase Admin SDK exactly once (avoids double-init in
 * serverless / hot-reload scenarios).
 * All logic calling `auth` / `db` must import from this file.
 */
export function initializeFirebaseAdmin(): App {
  if (getApps().length > 0) {
    console.log("🔄 [Firebase Admin] Using existing Firebase Admin instance")
    return getApps()[0]!
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.error("❌ [Firebase Admin] Missing Firebase Admin credentials in environment variables")
    throw new Error(
      "Missing Firebase Admin credentials. Make sure " +
        "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY " +
        "environment variables are set.",
    )
  }

  try {
    console.log("🔄 [Firebase Admin] Initializing Firebase Admin SDK")

    // Firebase Admin expects real line breaks in the private key
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")

    const app = initializeAdminApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      projectId: FIREBASE_PROJECT_ID,
    })

    console.log("✅ [Firebase Admin] Firebase Admin SDK initialized successfully")
    return app
  } catch (error: any) {
    console.error("❌ [Firebase Admin] Failed to initialize Firebase Admin SDK:", error.message)
    console.error("❌ [Firebase Admin] Error stack:", error.stack)
    throw new Error(`Failed to initialize Firebase Admin: ${error.message}`)
  }
}

// This function ensures we initialize the app only once.
function getFirebaseAdminApp() {
  // If the app is already initialized, return it.
  if (admin.apps.length > 0) {
    return admin.app()
  }

  // Format the private key, replacing the escaped newlines.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined

  // Check for essential environment variables.
  if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
    console.error("CRITICAL: Firebase Admin SDK environment variables are not set. Cannot initialize.")
    // Return null if configuration is missing.
    return null
  }

  try {
    // Initialize the app with the credentials.
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    })
    console.log("Firebase Admin SDK initialized successfully.")
    return app
  } catch (error) {
    console.error("CRITICAL: Firebase Admin SDK initialization error:", error)
    // Return null on failure.
    return null
  }
}

let adminApp: App | null

if (getApps().length === 0) {
  try {
    // Initialize Firebase Admin with service account
    adminApp = initializeFirebaseAdmin()
  } catch (error) {
    console.error("❌ Firebase Admin initialization error:", error)
    throw error
  }
} else {
  adminApp = getApps()[0]
  console.log("✅ Firebase Admin already initialized")
}

// Get the initialized app.
const firebaseAdminApp = getFirebaseAdminApp()

// Export Firestore and Auth instances. If initialization failed, export mock objects to prevent crashes.
const adminDb: Firestore = firebaseAdminApp ? getFirestore(firebaseAdminApp) : ({} as Firestore)
const auth: Auth = firebaseAdminApp ? getAuth(firebaseAdminApp) : ({} as Auth)
const storage = firebaseAdminApp ? getStorage(firebaseAdminApp) : null

// Export a utility function to check the initialization status from other parts of the app.
export const isFirebaseAdminInitialized = () => {
  return admin.apps.length > 0 && !!firebaseAdminApp
}

// Initialize services
// export const adminDb: Firestore = getFirestore(adminApp)
// export const auth: Auth = getAuth(adminApp)
// export const storage = getStorage(adminApp)

// Export with the exact names the system expects
export const adminAuth = auth
export const firestore = adminDb

// REQUIRED: Export db as a named export (this was missing)
export const db: Firestore = adminDb

// REQUIRED: Export admin object with methods that match Firebase Admin SDK usage patterns
export const firebaseAdmin = {
  auth: () => auth,
  firestore: () => adminDb,
  storage: () => storage,
  app: () => firebaseAdminApp,
  // Direct access to services for convenience
  authService: auth,
  firestoreService: adminDb,
  storageService: storage,
}

// Default export
export default firebaseAdminApp

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
    const decodedToken = await auth.verifyIdToken(idToken)
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
    const ref = adminDb.collection("users").doc(userId)
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

/* -------------------------------------------------------------------------- */
/*                           Re-export Firestore types                        */
/* -------------------------------------------------------------------------- */

export { FieldValue }

// Legacy export for backward compatibility
export const firebaseDb = {
  auth: () => auth,
  firestore: () => firestore,
  storage: () => storage,
}
