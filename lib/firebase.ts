import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Check if Firebase environment variables are available
const hasValidConfig =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
}

// Initialize Firebase
let app, auth, db, storage

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApps()[0]
  }

  // Initialize Firebase services
  auth = getAuth(app)

  // Configure auth to use the production domain for action URLs
  if (typeof window !== "undefined") {
    // Only run this on the client side
    auth.useDeviceLanguage()

    // Set the auth domain to the production domain
    if (process.env.NODE_ENV === "production") {
      // @ts-ignore - This is a valid property but TypeScript doesn't recognize it
      auth.tenantId = "massclip.pro"
    }
  }

  db = getFirestore(app)
  storage = getStorage(app)
} catch (error) {
  console.error("Firebase initialization error:", error)

  // Create dummy implementations for development/preview
  auth = {} as any
  db = {} as any
  storage = {} as any
}

// Flag to check if Firebase is properly configured
export const isFirebaseConfigured = hasValidConfig

export { app, auth, db, storage }
