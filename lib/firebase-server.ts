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

export function getAdminDb() {
  const { db } = getFirebaseAdmin()
  return db
}

export function getAdminAuth() {
  const { auth } = getFirebaseAdmin()
  return auth
}

// Export the Firestore database instance
export const db = getFirebaseAdmin().db

// Export the Firebase Auth instance
export const auth = getFirebaseAdmin().auth

// For compatibility with existing code
export default {
  app: getFirebaseAdmin().app,
  db: getFirebaseAdmin().db,
  auth: getFirebaseAdmin().auth,
}
