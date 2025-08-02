import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

let adminApp: any = null

export function getFirebaseAdmin() {
  if (adminApp) {
    return adminApp
  }

  try {
    // Check if we already have an initialized app
    const existingApps = getApps()
    if (existingApps.length > 0) {
      adminApp = existingApps[0]
      return adminApp
    }

    // Initialize Firebase Admin
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

    if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error("Missing Firebase Admin configuration")
    }

    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    })

    console.log("✅ Firebase Admin initialized successfully")
    return adminApp
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error)
    throw error
  }
}

export function getAdminAuth() {
  const app = getFirebaseAdmin()
  return getAuth(app)
}

export function getAdminDb() {
  const app = getFirebaseAdmin()
  return getFirestore(app)
}

// Named exports for compatibility
export const auth = getAdminAuth()
export const db = getAdminDb()
