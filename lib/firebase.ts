"use client"

import { initializeApp, getApps, type FirebaseApp, deleteApp } from "firebase/app"
import { getAuth, type Auth, connectAuthEmulator, setPersistence, browserSessionPersistence } from "firebase/auth"
import { getFirestore, type Firestore, connectFirestoreEmulator } from "firebase/firestore"
import { getStorage, type FirebaseStorage, connectStorageEmulator } from "firebase/storage"
import { getFirebaseConfig } from "./firebase-config"

// Singleton pattern for Firebase initialization
let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let firebaseDb: Firestore | null = null
let firebaseStorage: FirebaseStorage | null = null

export const initializeFirebase = () => {
  try {
    if (!firebaseApp) {
      // Get Firebase configuration
      const firebaseConfig = getFirebaseConfig()

      // Initialize Firebase only if it hasn't been initialized yet
      if (!getApps().length) {
        console.log("Initializing Firebase app...")
        firebaseApp = initializeApp(firebaseConfig)
      } else {
        console.log("Firebase already initialized, getting existing app")
        firebaseApp = getApps()[0]
      }

      // Initialize Firebase services
      firebaseAuth = getAuth(firebaseApp)
      firebaseDb = getFirestore(firebaseApp)
      firebaseStorage = getStorage(firebaseApp)

      if (firebaseAuth) {
        setPersistence(firebaseAuth, browserSessionPersistence).catch((error) => {
          console.error("Failed to set auth persistence:", error)
        })
      }

      // Connect to emulators in development if needed
      if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
        if (firebaseAuth) connectAuthEmulator(firebaseAuth, "http://localhost:9099")
        if (firebaseDb) connectFirestoreEmulator(firebaseDb, "localhost", 8080)
        if (firebaseStorage) connectStorageEmulator(firebaseStorage, "localhost", 9199)
      }

      console.log("Firebase initialized successfully")
    }

    return {
      app: firebaseApp,
      auth: firebaseAuth,
      db: firebaseDb,
      storage: firebaseStorage,
    }
  } catch (error) {
    console.error("Error initializing Firebase:", error)
    return {
      app: null,
      auth: null,
      db: null,
      storage: null,
      error,
    }
  }
}

// Initialize Firebase on module import
const firebase = initializeFirebase()

// Export Firebase instances - REQUIRED EXPORTS
export const app = firebase.app
export const auth = firebase.auth
export const db = firebase.db
export const storage = firebase.storage

// Helper function to check if Firebase is configured
export const isFirebaseConfigured = () => {
  return !!firebase.app && !!firebase.auth && !!firebase.db && !!firebase.storage
}

// Export the initialization function for compatibility
export const initializeFirebaseApp = initializeFirebase

// Function to completely reset Firebase
export const resetFirebase = async () => {
  try {
    console.log("[v0] Resetting Firebase completely...")

    // Delete all Firebase apps
    const apps = getApps()
    for (const app of apps) {
      await deleteApp(app)
    }

    // Reset singleton variables
    firebaseApp = null
    firebaseAuth = null
    firebaseDb = null
    firebaseStorage = null

    console.log("[v0] Firebase reset complete")
    return true
  } catch (error) {
    console.error("Error resetting Firebase:", error)
    return false
  }
}

// Default export
export default firebase.app
