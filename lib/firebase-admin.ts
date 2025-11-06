import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getAuth, type Auth } from "firebase-admin/auth"

const isBuildTime =
  process.env.NEXT_PHASE === "phase-production-build" ||
  (process.env.NODE_ENV === "production" && !process.env.FIREBASE_PROJECT_ID)

let adminApp: App | null = null
let adminDbInstance: Firestore | null = null
let adminAuthInstance: Auth | null = null

function initializeFirebaseAdmin(): App | null {
  // Skip initialization during build time
  if (isBuildTime) {
    console.log("⏭️ [Firebase Admin] Skipping initialization during build time")
    return null
  }

  // Return existing app if already initialized
  if (adminApp) {
    return adminApp
  }

  const existingApps = getApps()
  if (existingApps.length > 0) {
    adminApp = existingApps[0]
    console.log("✅ Firebase Admin already initialized")
    return adminApp
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("⚠️ Firebase Admin credentials not found")
      return null
    }

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })

    console.log("✅ Firebase Admin initialized successfully")
    return adminApp
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error)
    return null
  }
}

export const getAdminApp = (): App | null => {
  if (isBuildTime) return null
  if (!adminApp) {
    initializeFirebaseAdmin()
  }
  return adminApp
}

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(target, prop) {
    if (isBuildTime) {
      throw new Error("Firebase cannot be used during build time")
    }
    if (!adminDbInstance) {
      const app = getAdminApp()
      if (app) {
        adminDbInstance = getFirestore(app)
      }
    }
    return adminDbInstance?.[prop as keyof Firestore]
  },
})

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(target, prop) {
    if (isBuildTime) {
      throw new Error("Firebase cannot be used during build time")
    }
    if (!adminAuthInstance) {
      const app = getAdminApp()
      if (app) {
        adminAuthInstance = getAuth(app)
      }
    }
    return adminAuthInstance?.[prop as keyof Auth]
  },
})

// Initialize on module load (but will skip during build)
initializeFirebaseAdmin()
