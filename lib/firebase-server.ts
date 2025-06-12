import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

let adminApp: any = null
let adminDb: any = null

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
      console.log("✅ Firebase Admin initialized successfully")
    } catch (error) {
      console.error("❌ Firebase Admin initialization failed:", error)
      throw error
    }
  }

  return { app: adminApp, db: adminDb }
}

export function getAdminDb() {
  const { db } = getFirebaseAdmin()
  return db
}

// Export the Firestore database instance
export const db = getFirebaseAdmin().db

// For compatibility with existing code
export default {
  app: getFirebaseAdmin().app,
  db: getFirebaseAdmin().db,
}
