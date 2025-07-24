import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getFirestore, type Firestore, FieldValue as FirestoreFieldValue } from "firebase-admin/firestore"
import { getAuth, type Auth } from "firebase-admin/auth"
import type { NextRequest } from "next/server"

let app: App
let adminDb: Firestore
let auth: Auth

export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

      if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
        throw new Error("Missing Firebase Admin credentials")
      }

      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      })

      console.log("✅ Firebase Admin initialized successfully")
    } catch (error) {
      console.error("❌ Firebase Admin initialization error:", error)
      throw error
    }
  } else {
    app = getApps()[0]
  }

  adminDb = getFirestore(app)
  auth = getAuth(app)

  return { app, db: adminDb, auth }
}

// Initialize on module load
const { app: firebaseApp, db, auth: firebaseAuth } = initializeFirebaseAdmin()

export { firebaseApp as app }
export { db }
export { db as adminDb }
export { db as firestore }
export { firebaseAuth as auth }
export { FirestoreFieldValue as FieldValue }

export async function getAuthenticatedUser(headers: Headers) {
  try {
    const authHeader = headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Missing or invalid authorization header")
    }

    const idToken = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(idToken)
    return decodedToken
  } catch (error) {
    console.error("Authentication error:", error)
    throw new Error("Authentication failed")
  }
}

export async function getUserFromRequest(request: NextRequest) {
  const headers = request.headers
  return await getAuthenticatedUser(headers)
}

export async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries) {
        throw lastError
      }

      await new Promise((resolve) => setTimeout(resolve, delay * attempt))
    }
  }

  throw lastError!
}
