import { cert, getApps, initializeApp } from "firebase-admin/app"
import * as admin from "firebase-admin"

/**
 * Initializes Firebase Admin SDK if it hasn't been initialized already
 * This prevents multiple initializations in serverless environments
 */
export function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    // Check for required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

    if (!projectId || !clientEmail || !privateKey) {
      console.error("Missing Firebase Admin SDK credentials in environment variables")
      throw new Error("Firebase Admin SDK credentials are required")
    }

    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
      console.log("Firebase Admin SDK initialized successfully")
    } catch (error) {
      console.error("Error initializing Firebase Admin SDK:", error)
      throw error
    }
  }

  return admin
}

// Initialize Firebase Admin if not already initialized
const adminApp = initializeFirebaseAdmin()

// Export the Firestore database
export const db = adminApp.firestore()
export const auth = adminApp.auth()

// Export the admin app
export { adminApp as admin }
