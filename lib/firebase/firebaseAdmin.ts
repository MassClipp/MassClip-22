import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

let adminApp: App | null = null
let adminAuth: Auth | null = null
let adminDb: Firestore | null = null
let isInitialized = false
let initializationError: string | null = null

export function initializeFirebaseAdmin() {
  if (isInitialized) {
    return { app: adminApp, auth: adminAuth, db: adminDb, error: initializationError }
  }

  try {
    console.log("🔥 [Firebase Admin] Starting initialization...")

    // Check if required environment variables exist
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY

    console.log("🔍 [Firebase Admin] Environment check:", {
      projectId: !!projectId,
      clientEmail: !!clientEmail,
      privateKey: !!privateKey,
    })

    if (!projectId || !clientEmail || !privateKey) {
      const missingVars = []
      if (!projectId) missingVars.push("FIREBASE_PROJECT_ID")
      if (!clientEmail) missingVars.push("FIREBASE_CLIENT_EMAIL")
      if (!privateKey) missingVars.push("FIREBASE_PRIVATE_KEY")

      initializationError = `Missing Firebase Admin environment variables: ${missingVars.join(", ")}`
      console.error("❌ [Firebase Admin]", initializationError)
      isInitialized = true
      return { app: null, auth: null, db: null, error: initializationError }
    }

    // Check if Firebase Admin is already initialized
    if (getApps().length > 0) {
      console.log("🔥 [Firebase Admin] Using existing app")
      adminApp = getApps()[0]
    } else {
      console.log("🔥 [Firebase Admin] Creating new app")

      // Clean up the private key (remove quotes and handle newlines)
      const cleanPrivateKey = privateKey.replace(/\\n/g, "\n").replace(/"/g, "")

      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: cleanPrivateKey,
        }),
        projectId,
      })
    }

    // Initialize services
    adminAuth = getAuth(adminApp)
    adminDb = getFirestore(adminApp)

    console.log("✅ [Firebase Admin] Initialized successfully")
    isInitialized = true

    return { app: adminApp, auth: adminAuth, db: adminDb, error: null }
  } catch (error: any) {
    console.error("❌ [Firebase Admin] Initialization failed:", error)
    initializationError = error.message || "Failed to initialize Firebase Admin"
    isInitialized = true
    return { app: null, auth: null, db: null, error: initializationError }
  }
}

// Initialize immediately
const firebaseAdmin = initializeFirebaseAdmin()

// Export the instances
export const app = firebaseAdmin.app
export const auth = firebaseAdmin.auth
export const db = firebaseAdmin.db
export const adminError = firebaseAdmin.error

// Export initialization function for manual retry
export { initializeFirebaseAdmin as reinitializeFirebaseAdmin }
