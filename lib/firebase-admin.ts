import type { App } from "firebase-admin/app"
import { getApps, cert } from "firebase-admin/app"
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore"
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth"
import { getStorage, type Storage } from "firebase-admin/storage"
import admin from "firebase-admin"

let adminApp: App | null = null

const isBuildTime = () => {
  // Check if we're in Next.js build phase
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.NEXT_PHASE === "phase-export") {
    return true
  }
  // Check if we're in a CI/build environment without runtime credentials
  if (process.env.CI && !process.env.VERCEL_ENV) {
    return true
  }
  return false
}

const createMockFirestore = (): Firestore => {
  return new Proxy({} as Firestore, {
    get(target, prop) {
      // Return mock functions for common Firestore methods
      if (prop === "collection") {
        return () => createMockFirestore()
      }
      if (prop === "doc") {
        return () => createMockFirestore()
      }
      if (prop === "get" || prop === "set" || prop === "update" || prop === "delete") {
        return async () => ({})
      }
      return () => {}
    },
  }) as Firestore
}

const createMockAuth = (): Auth => {
  return new Proxy({} as Auth, {
    get(target, prop) {
      // Return mock functions for common Auth methods
      if (prop === "verifyIdToken" || prop === "getUser" || prop === "getUserByEmail") {
        return async () => ({})
      }
      if (prop === "createUser" || prop === "updateUser" || prop === "deleteUser") {
        return async () => ({})
      }
      return () => {}
    },
  }) as Auth
}

const createMockStorage = (): Storage => {
  return new Proxy({} as Storage, {
    get(target, prop) {
      if (prop === "bucket") {
        return () => createMockStorage()
      }
      return () => {}
    },
  }) as Storage
}

/**
 * Initializes the Firebase Admin SDK, ensuring it only runs once.
 * This function is exported because other modules in your project depend on it.
 * @returns The initialized Firebase Admin App instance.
 */
export function initializeFirebaseAdmin(): App {
  if (isBuildTime()) {
    console.log("⏭️  [Firebase Admin] Skipping initialization during build time")
    // Return a mock app to prevent errors during static analysis
    return {} as App
  }

  if (adminApp) {
    return adminApp
  }

  if (getApps().length > 0 && getApps()[0]) {
    adminApp = getApps()[0]!
    return adminApp
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.error("❌ [Firebase Admin] CRITICAL: Missing Firebase Admin credentials.")
    console.error("Available env vars:", {
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
    console.log("✅ [Firebase Admin] Firebase Admin SDK initialized successfully.")
    return adminApp
  } catch (error) {
    console.error("❌ [Firebase Admin] CRITICAL: Firebase Admin SDK initialization failed.", error)
    throw new Error(`Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Export a utility function to check the initialization status.
export const isFirebaseAdminInitialized = () => {
  if (isBuildTime()) {
    return false
  }

  try {
    if (!adminApp) {
      adminApp = initializeFirebaseAdmin()
    }
    return !!adminApp && getApps().length > 0
  } catch (error) {
    console.error("❌ [Firebase Admin] Initialization check failed:", error)
    return false
  }
}

export const getAdminDb = (): Firestore => {
  if (isBuildTime()) {
    return createMockFirestore()
  }

  if (!adminApp) {
    adminApp = initializeFirebaseAdmin()
  }
  return getFirestore(adminApp)
}

export const getAdminAuth = (): Auth => {
  if (isBuildTime()) {
    return createMockAuth()
  }

  if (!adminApp) {
    adminApp = initializeFirebaseAdmin()
  }
  return getAuth(adminApp)
}

export const getAdminStorage = (): Storage => {
  if (isBuildTime()) {
    return createMockStorage()
  }

  if (!adminApp) {
    adminApp = initializeFirebaseAdmin()
  }
  return getStorage(adminApp)
}

// Export lazy-initialized instances
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(target, prop) {
    return getAdminDb()[prop as keyof Firestore]
  },
})

export const auth: Auth = new Proxy({} as Auth, {
  get(target, prop) {
    return getAdminAuth()[prop as keyof Auth]
  },
})

export const storage: Storage = new Proxy({} as Storage, {
  get(target, prop) {
    return getAdminStorage()[prop as keyof Storage]
  },
})

// Aliases for backward compatibility and consistent naming.
export const adminAuth = auth
export const firestore = adminDb
export const db = adminDb
export const firebaseAdmin = {
  auth: () => getAdminAuth(),
  firestore: () => getAdminDb(),
  storage: () => getAdminStorage(),
  app: () => adminApp || initializeFirebaseAdmin(),
}

export default new Proxy({} as App, {
  get(target, prop) {
    if (!adminApp) {
      adminApp = initializeFirebaseAdmin()
    }
    return adminApp[prop as keyof App]
  },
})

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
    return await getAdminAuth().verifyIdToken(idToken)
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
  const ref = getAdminDb().collection("users").doc(userId)
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
