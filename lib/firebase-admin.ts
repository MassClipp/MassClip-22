import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin SDK
const apps = getApps()
let app

if (apps.length === 0) {
  try {
    // Parse the private key from environment variable
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

    if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
      throw new Error("Missing required Firebase Admin environment variables")
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
  app = apps[0]
}

export const auth = getAuth(app)
export const db = getFirestore(app)
export { app }
