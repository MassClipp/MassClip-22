import * as admin from "firebase-admin"
import { getApps } from "firebase-admin/app"

// Initialize Firebase Admin
export function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      // Get the Firebase private key
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
        // Add any other configuration options here
      })
    } catch (error) {
      console.error("Firebase admin initialization error", error)
    }
  }

  return admin
}

// Configure action URL settings for Firebase Auth
export function configureFirebaseAuthSettings() {
  const auth = admin.auth()

  // Always set the production domain for action URLs
  auth.setSettings({
    uri: "https://massclip.pro",
  })

  return auth
}

// Initialize Firebase Admin if not already initialized
initializeFirebaseAdmin()

// Export the Firestore database
export const db = admin.firestore()

export { admin }
