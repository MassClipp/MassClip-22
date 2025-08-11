import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

let app: App
let db: Firestore

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

const hasAllCreds = FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY

if (hasAllCreds) {
  if (!getApps().length) {
    console.log("Initializing Firebase Admin SDK...")
    try {
      app = initializeApp({
        credential: cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines before parsing
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      })
      console.log("Firebase Admin SDK initialized successfully.")
    } catch (error: any) {
      console.error("Firebase Admin SDK initialization failed:", error.message)
      // Throwing an error here will prevent the app from starting with a broken config
      throw new Error(`Firebase Admin initialization failed: ${error.message}`)
    }
  } else {
    app = getApps()[0]!
    console.log("Using existing Firebase Admin SDK instance.")
  }
  db = getFirestore(app)
} else {
  console.warn(
    "Firebase Admin credentials are not fully configured. Some server-side Firebase features will be disabled.",
  )
}

export { db }
