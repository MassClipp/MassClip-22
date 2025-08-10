import type { App } from "firebase-admin/app"
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore"
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth"
import { getStorage, type Storage } from "firebase-admin/storage"
import admin from "firebase-admin"

/**
 * Ensures the Firebase Admin SDK is initialized only once.
 * @returns The initialized Firebase Admin App instance, or null if configuration is missing.
 */
function getFirebaseAdminApp(): App | null {
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0]
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const projectId = process.env.FIREBASE_PROJECT_ID

  if (!privateKey || !clientEmail || !projectId) {
    console.error("❌ [Firebase Admin] CRITICAL: Missing Firebase Admin credentials in environment variables.")
    return null
  }

  try {
    console.log("🔄 [Firebase Admin] Initializing Firebase Admin SDK...")
    const app = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    })
    console.log("✅ [Firebase Admin] Firebase Admin SDK initialized successfully.")
    return app
  } catch (error) {
    console.error("❌ [Firebase Admin] CRITICAL: Firebase Admin SDK initialization failed.", error)
    return null
  }
}

const adminApp = getFirebaseAdminApp()

// Export a utility function to check the initialization status from other parts of the app.
export const isFirebaseAdminInitialized = () => !!adminApp

// Export Firestore, Auth, and Storage instances.
// If initialization failed, they will be null or mock objects to prevent runtime crashes.
export const adminDb: Firestore = adminApp ? getFirestore(adminApp) : ({} as Firestore)
export const auth: Auth = adminApp ? getAuth(adminApp) : ({} as Auth)
export const storage: Storage | null = adminApp ? getStorage(adminApp) : null

// Aliases for backward compatibility and consistent naming
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
 * Verifies a Firebase ID token.
 * @param idToken The ID token to verify.
 * @returns The decoded token.
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  if (!isFirebaseAdminInitialized()) {
    throw new Error("Firebase Admin SDK is not initialized. Cannot verify ID token.")
  }
  try {
    console.log("🔄 [Auth] Verifying Firebase ID token...")
    const decodedToken = await auth.verifyIdToken(idToken)
    console.log(`✅ [Auth] Token verified for user: ${decodedToken.uid}`)
    return decodedToken
  } catch (error: any) {
    console.error(`❌ [Auth] Token verification failed: ${error.message}`)
    throw error
  }
}

/**
 * Gets the authenticated user from request headers.
 * @param headers The request headers.
 * @returns The user's UID and email.
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
 * @param userId The user's ID.
 * @param profileData The data to save.
 */
export async function createOrUpdateUserProfile(userId: string, profileData: Record<string, unknown>) {
  if (!isFirebaseAdminInitialized()) {
    throw new Error("Firebase Admin SDK is not initialized. Cannot update profile.")
  }
  const ref = adminDb.collection("users").doc(userId)
  const now = FieldValue.serverTimestamp()

  try {
    const doc = await ref.get()
    if (doc.exists) {
      console.log(`🔄 [Firestore] Updating user profile for ${userId}`)
      await ref.update({ ...profileData, updatedAt: now })
    } else {
      console.log(`🔄 [Firestore] Creating new user profile for ${userId}`)
      await ref.set({ ...profileData, createdAt: now, updatedAt: now }, { merge: true })
    }
    console.log(`✅ [Firestore] User profile saved for ${userId}`)
  } catch (error) {
    console.error(`❌ [Firestore] Failed to save user profile for ${userId}:`, error)
    throw error
  }
}

export { FieldValue }
