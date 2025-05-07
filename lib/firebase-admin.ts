import { cert, initializeApp, getApps } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

/**
 * Initializes Firebase Admin SDK if it hasn't been initialized already
 * This prevents multiple initializations in serverless environments
 */
export function initializeFirebaseAdmin() {
  // Check if we're in the v0.dev preview environment
  const isV0Preview = typeof window !== "undefined" && window.location.hostname.includes("v0.dev")

  // If we're in v0.dev preview, return mock implementations
  if (isV0Preview) {
    console.log("Running in v0.dev preview - using mock Firebase Admin")
    return
  }

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
}

// Create mock implementations for v0.dev preview
const mockFirestore = {
  collection: () => ({
    doc: () => ({
      get: async () => ({ exists: true, data: () => ({}) }),
      set: async () => ({}),
      update: async () => ({}),
      delete: async () => ({}),
    }),
    where: () => ({
      get: async () => ({ empty: false, docs: [] }),
    }),
  }),
}

// Check if we're in the v0.dev preview environment
const isV0Preview = typeof window !== "undefined" && window.location.hostname.includes("v0.dev")

// Initialize Firebase Admin if not in preview
if (!isV0Preview) {
  initializeFirebaseAdmin()
}

// Export the Firestore database or a mock if in preview
export const db = isV0Preview ? (mockFirestore as any) : getFirestore()
