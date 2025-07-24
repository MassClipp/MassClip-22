import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore, FieldValue } from "firebase-admin/firestore"
import type { NextRequest } from "next/server"

let app: App
let auth: Auth
let firestore: Firestore
let adminDb: Firestore

// Initialize Firebase Admin SDK
export function initializeFirebaseAdmin(): App {
  if (getApps().length === 0) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

      if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
        throw new Error("Missing Firebase Admin configuration")
      }

      app = initializeApp({
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
  } else {
    app = getApps()[0]
  }

  // Initialize services
  auth = getAuth(app)
  firestore = getFirestore(app)
  adminDb = firestore

  return app
}

// Initialize on import
initializeFirebaseAdmin()

// Retry utility function
export async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.warn(`Attempt ${attempt} failed:`, error)

      if (attempt === maxRetries) {
        break
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay * attempt))
    }
  }

  throw lastError!
}

// Get authenticated user from request headers
export async function getAuthenticatedUser(headers: Headers): Promise<{ uid: string; email?: string }> {
  const authHeader = headers.get("authorization")

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header")
  }

  const idToken = authHeader.substring(7)

  try {
    const decodedToken = await auth.verifyIdToken(idToken)
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    }
  } catch (error) {
    console.error("Token verification failed:", error)
    throw new Error("Invalid authentication token")
  }
}

// Alternative method to get user from request body
export async function getUserFromRequest(request: NextRequest): Promise<{ uid: string; email?: string }> {
  try {
    const body = await request.json()
    const { idToken } = body

    if (!idToken) {
      throw new Error("No ID token provided")
    }

    const decodedToken = await auth.verifyIdToken(idToken)
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    }
  } catch (error) {
    console.error("Failed to get user from request:", error)
    throw error
  }
}

// Export initialized instances
export { auth, firestore, adminDb, FieldValue }

// Export the app instance
export { app }

// Additional utility exports
export const db = adminDb
