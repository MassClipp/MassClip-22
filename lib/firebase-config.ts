import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  )
}

// Get Firebase configuration
export function getFirebaseConfig() {
  if (!isFirebaseConfigured()) {
    console.error("❌ Firebase configuration is incomplete")
    throw new Error("Firebase configuration is incomplete. Please check your environment variables.")
  }

  console.log("✅ Firebase configuration loaded successfully")
  return firebaseConfig
}

// Initialize Firebase app
let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage

try {
  if (!getApps().length) {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase configuration is incomplete")
    }
    app = initializeApp(firebaseConfig)
    console.log("✅ Firebase app initialized")
  } else {
    app = getApps()[0]
    console.log("✅ Using existing Firebase app")
  }

  // Initialize services
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)

  // Enable emulator in development
  if (process.env.NODE_ENV === "development") {
    // Emulator configuration would go here if needed
  }
} catch (error) {
  console.error("❌ Firebase initialization error:", error)
  throw error
}

// Export Firebase services
export { app, auth, db, storage }
export default app
