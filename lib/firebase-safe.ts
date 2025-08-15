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

// Check if all required config values are present
const requiredConfigKeys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"] as const

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let isFirebaseConfigured = false
let firebaseError: string | null = null

function checkFirebaseConfig(): boolean {
  console.log("🔄 Checking Firebase configuration...")

  const missingKeys = requiredConfigKeys.filter((key) => !firebaseConfig[key])

  if (missingKeys.length > 0) {
    firebaseError = `Missing Firebase config: ${missingKeys.join(", ")}`
    console.error("❌ Firebase config error:", firebaseError)
    return false
  }

  console.log("✅ Firebase configuration is complete")
  return true
}

function initializeFirebaseSafe(): void {
  try {
    if (!checkFirebaseConfig()) {
      return
    }

    // Initialize Firebase only if it hasn't been initialized yet
    if (getApps().length === 0) {
      console.log("🔄 Initializing Firebase app...")
      app = initializeApp(firebaseConfig)
      console.log("✅ Firebase app initialized")
    } else {
      app = getApps()[0]
      console.log("✅ Using existing Firebase app")
    }

    // Initialize Auth
    console.log("🔄 Initializing Firebase Auth...")
    auth = getAuth(app)

    // Initialize Firestore
    console.log("🔄 Initializing Firestore...")
    db = getFirestore(app)

    // Connect to emulators in development if specified
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
      console.log("🔄 Connecting to Firebase emulators...")
      try {
        connectAuthEmulator(auth, "http://localhost:9099")
        connectFirestoreEmulator(db, "localhost", 8080)
        console.log("✅ Connected to Firebase emulators")
      } catch (error) {
        console.warn("⚠️ Could not connect to emulators (they may already be connected):", error)
      }
    }

    isFirebaseConfigured = true
    console.log("✅ Firebase initialized successfully")
  } catch (error) {
    console.error("❌ Firebase initialization error:", error)
    firebaseError = error instanceof Error ? error.message : "Unknown Firebase initialization error"
    isFirebaseConfigured = false
  }
}

// Initialize Firebase when this module is imported
if (typeof window !== "undefined") {
  initializeFirebaseSafe()
}

export { app, auth, db, isFirebaseConfigured, firebaseError, initializeFirebaseSafe }
