import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

let adminApp: any = null
let adminDb: any = null
let adminAuth: any = null

export function getFirebaseAdmin() {
  if (!adminApp) {
    try {
      // Check if Firebase Admin is already initialized
      const existingApps = getApps()
      if (existingApps.length > 0) {
        adminApp = existingApps[0]
      } else {
        // Initialize Firebase Admin
        const projectId = process.env.FIREBASE_PROJECT_ID
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

        if (!projectId || !clientEmail || !privateKey) {
          throw new Error("Missing Firebase Admin credentials")
        }

        adminApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          projectId,
        })
      }

      adminDb = getFirestore(adminApp)
      adminAuth = getAuth(adminApp)
      console.log("✅ Firebase Admin initialized successfully")
    } catch (error) {
      console.error("❌ Firebase Admin initialization failed:", error)
      throw error
    }
  }

  return { app: adminApp, db: adminDb, auth: adminAuth }
}

export function getAdminApp() {
  if (adminApp) {
    return adminApp
  }

  try {
    // Check if we already have an initialized app
    const existingApps = getApps()
    if (existingApps.length > 0) {
      adminApp = existingApps[0]
      return adminApp
    }

    // Initialize new app
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
    if (!privateKey) {
      throw new Error("FIREBASE_PRIVATE_KEY environment variable is not set")
    }

    // Replace escaped newlines with actual newlines
    const formattedPrivateKey = privateKey.replace(/\\n/g, "\n")

    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedPrivateKey,
      }),
    })

    console.log("✅ [Firebase Admin] Initialized successfully")
    return adminApp
  } catch (error) {
    console.error("❌ [Firebase Admin] Initialization failed:", error)
    throw error
  }
}

export function getAdminDb() {
  if (adminDb) {
    return adminDb
  }

  try {
    const app = getAdminApp()
    adminDb = getFirestore(app)
    console.log("✅ [Firebase Admin] Firestore initialized")
    return adminDb
  } catch (error) {
    console.error("❌ [Firebase Admin] Firestore initialization failed:", error)
    throw error
  }
}

export function getAdminAuth() {
  if (adminAuth) {
    return adminAuth
  }

  try {
    const app = getAdminApp()
    adminAuth = getAuth(app)
    console.log("✅ [Firebase Admin] Auth initialized")
    return adminAuth
  } catch (error) {
    console.error("❌ [Firebase Admin] Auth initialization failed:", error)
    throw error
  }
}

// Export the database instance for compatibility
export const db = getAdminDb()

// Export the auth instance for compatibility
export const auth = getAdminAuth()

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

      if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
        throw new Error("Missing required Firebase Admin environment variables")
      }

      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      })

      console.log("✅ Firebase Admin initialized successfully")
    } catch (error) {
      console.error("❌ Firebase Admin initialization failed:", error)
      throw error
    }
  }
}

// For compatibility with existing code
export default {
  app: getAdminApp(),
  db: getAdminDb(),
  auth: getAdminAuth(),
}

export { initializeFirebaseAdmin }
