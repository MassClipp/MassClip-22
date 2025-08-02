import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getAuth, type Auth } from "firebase-admin/auth"

let app: App | undefined
let db: Firestore | undefined
let auth: Auth | undefined

export function initializeFirebaseAdmin(): App {
  if (app) {
    return app
  }

  try {
    // Check if Firebase Admin is already initialized
    const existingApps = getApps()
    if (existingApps.length > 0) {
      app = existingApps[0]
      console.log("✅ [Firebase Admin] Using existing Firebase Admin app")
      return app
    }

    // Initialize Firebase Admin
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const projectId = process.env.FIREBASE_PROJECT_ID

    if (!privateKey || !clientEmail || !projectId) {
      throw new Error("Missing Firebase Admin environment variables")
    }

    // Replace escaped newlines in private key
    const formattedPrivateKey = privateKey.replace(/\\n/g, "\n")

    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
      projectId,
    })

    console.log("✅ [Firebase Admin] Firebase Admin initialized successfully")
    return app
  } catch (error) {
    console.error("❌ [Firebase Admin] Failed to initialize Firebase Admin:", error)
    throw error
  }
}

export function getFirebaseAdmin(): App {
  if (!app) {
    app = initializeFirebaseAdmin()
  }
  return app
}

export function getAdminDb(): Firestore {
  if (!db) {
    const adminApp = getFirebaseAdmin()
    db = getFirestore(adminApp)
  }
  return db
}

export function getAdminAuth(): Auth {
  if (!auth) {
    const adminApp = getFirebaseAdmin()
    auth = getAuth(adminApp)
  }
  return auth
}

// Named exports as required
export { db }

// Initialize db if not already done
if (!db) {
  try {
    db = getAdminDb()
  } catch (error) {
    console.error("❌ [Firebase Admin] Failed to initialize db export:", error)
  }
}
