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

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null
let firebaseError: string | null = null

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

export function initializeFirebaseSafe(): {
  app: FirebaseApp | null
  auth: Auth | null
  db: Firestore | null
  storage: FirebaseStorage | null
  error: string | null
} {
  try {
    if (!isFirebaseConfigured()) {
      firebaseError = "Firebase configuration is incomplete. Please check your environment variables."
      console.error("❌ Firebase configuration error:", firebaseError)
      return { app: null, auth: null, db: null, storage: null, error: firebaseError }
    }

    // Initialize Firebase only if it hasn't been initialized yet
    if (!getApps().length) {
      app = initializeApp(firebaseConfig)
      console.log("✅ Firebase app initialized")
    } else {
      app = getApps()[0]
      console.log("✅ Firebase app already initialized")
    }

    // Initialize services
    if (app) {
      auth = getAuth(app)
      db = getFirestore(app)
      storage = getStorage(app)
      console.log("✅ Firebase services initialized")
    }

    firebaseError = null
    return { app, auth, db, storage, error: null }
  } catch (error: any) {
    firebaseError = `Firebase initialization failed: ${error.message}`
    console.error("❌ Firebase initialization error:", error)
    return { app: null, auth: null, db: null, storage: null, error: firebaseError }
  }
}

// Initialize Firebase
const firebaseInit = initializeFirebaseSafe()
app = firebaseInit.app
auth = firebaseInit.auth
db = firebaseInit.db
storage = firebaseInit.storage
firebaseError = firebaseInit.error

// Export the initialized instances
export { app, auth, db, storage, firebaseError }

// Default export for compatibility
export default {
  app,
  auth,
  db,
  storage,
  firebaseError,
  isFirebaseConfigured,
  initializeFirebaseSafe,
}
