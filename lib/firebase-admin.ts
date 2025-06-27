import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getFirestore, type Firestore, FieldValue } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

let app: App | undefined
let db: Firestore | undefined

export function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

      if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
        throw new Error("Missing Firebase Admin configuration")
      }

      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      })
    } catch (error) {
      console.error("Failed to initialize Firebase Admin:", error)
      throw error
    }
  } else {
    app = getApps()[0]
  }

  if (!db) {
    db = getFirestore(app)
  }

  return { app, db }
}

// Initialize and export db
const { db: firestore } = initializeFirebaseAdmin()
export { firestore as db }

// Export FieldValue for convenience
export { FieldValue }

// Utility function for retrying operations
export async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.warn(`Attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay * attempt))
      }
    }
  }

  throw lastError!
}

// Get authenticated user from token
export async function getAuthenticatedUser(authHeader?: string) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header")
  }

  const token = authHeader.substring(7)

  try {
    const auth = getAuth()
    const decodedToken = await auth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("Token verification failed:", error)
    throw new Error("Invalid authentication token")
  }
}
