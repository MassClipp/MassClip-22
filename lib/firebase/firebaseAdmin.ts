import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

let adminApp: any = null

export function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const firebaseAdminConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }

  if (!firebaseAdminConfig.projectId || !firebaseAdminConfig.clientEmail || !firebaseAdminConfig.privateKey) {
    throw new Error("Missing Firebase Admin configuration")
  }

  adminApp = initializeApp({
    credential: cert(firebaseAdminConfig),
    projectId: firebaseAdminConfig.projectId,
  })

  return adminApp
}

// Initialize the app
const app = initializeFirebaseAdmin()

// Export the services
export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)
export const firestore = adminDb

// Legacy exports
export const auth = adminAuth
export const db = adminDb
