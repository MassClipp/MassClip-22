import * as admin from "firebase-admin"

/**
 * Initializes Firebase Admin SDK if it hasn't been initialized already
 * This prevents multiple initializations in serverless environments
 */
export function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      })
      console.log("Firebase Admin SDK initialized successfully")
    } catch (error) {
      console.error("Error initializing Firebase Admin SDK:", error)
      throw error
    }
  }
}

// Initialize Firebase Admin if not already initialized
initializeFirebaseAdmin()

// Export the Firestore database
export const db = admin.firestore()

// Export the auth instance
export const auth = admin.auth()

// Export the storage instance
export const storage = admin.storage()
