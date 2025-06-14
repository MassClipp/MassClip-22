import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"
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

// Export both app and db
export { app, db }
