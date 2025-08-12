import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, type Firestore, connectFirestoreEmulator } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Validate required config
const requiredKeys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"]
const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key as keyof typeof firebaseConfig])

if (missingKeys.length > 0) {
  console.error("Missing Firebase config keys:", missingKeys)
  throw new Error(`Missing Firebase configuration: ${missingKeys.join(", ")}`)
}

console.log("Firebase config check:", {
  hasApiKey: !!firebaseConfig.apiKey,
  hasAuthDomain: !!firebaseConfig.authDomain,
  hasProjectId: !!firebaseConfig.projectId,
  projectId: firebaseConfig.projectId,
})

let app: FirebaseApp
let auth: Auth
let db: Firestore

try {
  // Initialize Firebase
  if (getApps().length === 0) {
    console.log("Initializing Firebase app...")
    app = initializeApp(firebaseConfig)
  } else {
    app = getApps()[0]
  }

  // Initialize Auth
  auth = getAuth(app)

  // Initialize Firestore
  db = getFirestore(app)

  // Connect to emulators in development
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    try {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true })
      connectFirestoreEmulator(db, "localhost", 8080)
      console.log("Connected to Firebase emulators")
    } catch (error) {
      console.warn("Failed to connect to emulators:", error)
    }
  }

  console.log("Firebase initialized successfully")
} catch (error) {
  console.error("Firebase initialization error:", error)
  throw error
}

export { app, auth, db }
export default app
