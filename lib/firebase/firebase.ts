import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { getFirebaseConfig } from "../firebase-config"

// Initialize Firebase app if it hasn't been initialized yet
let app
if (!getApps().length) {
  const firebaseConfig = getFirebaseConfig()
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

// Initialize Firestore
const db = getFirestore(app)

const auth = getAuth(app)

// Export app, db, and auth
export { app, db, auth }
