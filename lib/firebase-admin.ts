import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

// Your service account credentials
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
}

// Initialize Firebase Admin
export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    try {
      initializeApp({
        credential: cert(serviceAccount),
      })
    } catch (error) {
      console.error("Firebase admin initialization error:", error)
    }
  }
}

// Initialize Firebase Admin
initializeFirebaseAdmin()

// Export Firestore and Auth
export const db = getFirestore()
export const auth = getAuth()
