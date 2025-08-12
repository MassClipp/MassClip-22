import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, type Firestore, connectFirestoreEmulator } from "firebase/firestore"

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

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let firebaseError: string | null = null

function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  )
}

function initializeFirebaseSafe(): { success: boolean; error?: string } {
  try {
    if (!isFirebaseConfigured()) {
      const error = "Firebase configuration is incomplete. Please check your environment variables."
      firebaseError = error
      console.error("❌ Firebase Config Error:", error)
      return { success: false, error }
    }

    // Initialize Firebase app if not already initialized
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig)
      console.log("✅ Firebase app initialized")
    } else {
      app = getApps()[0]
      console.log("✅ Firebase app already initialized")
    }

    // Initialize Auth
    if (!auth) {
      auth = getAuth(app)

      // Connect to emulator in development
      if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
        try {
          connectAuthEmulator(auth, "http://localhost:9099")
          console.log("🔧 Connected to Firebase Auth emulator")
        } catch (error) {
          console.warn("⚠️ Could not connect to Auth emulator:", error)
        }
      }
    }

    // Initialize Firestore
    if (!db) {
      db = getFirestore(app)

      // Connect to emulator in development
      if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
        try {
          connectFirestoreEmulator(db, "localhost", 8080)
          console.log("🔧 Connected to Firestore emulator")
        } catch (error) {
          console.warn("⚠️ Could not connect to Firestore emulator:", error)
        }
      }
    }

    firebaseError = null
    console.log("✅ Firebase initialized successfully")
    return { success: true }
  } catch (error: any) {
    const errorMessage = `Firebase initialization failed: ${error.message}`
    firebaseError = errorMessage
    console.error("❌ Firebase initialization error:", error)
    return { success: false, error: errorMessage }
  }
}

// Initialize Firebase on module load
const initResult = initializeFirebaseSafe()
if (!initResult.success) {
  console.error("❌ Failed to initialize Firebase:", initResult.error)
}

export { auth, db, isFirebaseConfigured, firebaseError, initializeFirebaseSafe }
