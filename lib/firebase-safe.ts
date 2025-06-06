"use client"

import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"
import { checkFirebaseConfig, getFirebaseConfig } from "./firebase-config-checker"

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null

export function initializeFirebaseSafe() {
  try {
    const configCheck = checkFirebaseConfig()

    if (!configCheck.isValid) {
      console.warn("Firebase not properly configured:", configCheck.message)
      return {
        app: null,
        auth: null,
        db: null,
        storage: null,
        isConfigured: false,
        error: configCheck.message,
      }
    }

    if (!getApps().length) {
      const config = getFirebaseConfig()
      app = initializeApp(config)
    } else {
      app = getApps()[0]
    }

    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)

    return {
      app,
      auth,
      db,
      storage,
      isConfigured: true,
      error: null,
    }
  } catch (error) {
    console.error("Firebase initialization error:", error)
    return {
      app: null,
      auth: null,
      db: null,
      storage: null,
      isConfigured: false,
      error: error instanceof Error ? error.message : "Unknown Firebase error",
    }
  }
}

// Initialize Firebase safely
const firebaseInstance = initializeFirebaseSafe()

export const {
  app: firebaseApp,
  auth: firebaseAuth,
  db: firebaseDb,
  storage: firebaseStorage,
  isConfigured: isFirebaseConfigured,
  error: firebaseError,
} = firebaseInstance

// Export with fallbacks
export { firebaseApp as app, firebaseAuth as auth, firebaseDb as db, firebaseStorage as storage }
