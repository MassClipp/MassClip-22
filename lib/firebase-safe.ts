"use client"

import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

// Global state for Firebase initialization
let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let firebaseDb: Firestore | null = null
let firebaseStorage: FirebaseStorage | null = null
let initializationError: string | null = null
let isConfigured = false

// Get Firebase configuration with fallbacks
const getFirebaseConfig = () => {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  }

  // Check if we have real config values or fallbacks
  const usingRealConfig =
    !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  return { config, usingRealConfig }
}

// Initialize Firebase safely - REQUIRED EXPORT
export function initializeFirebaseSafe() {
  try {
    // Check if already initialized
    if (firebaseApp) {
      return {
        app: firebaseApp,
        auth: firebaseAuth,
        db: firebaseDb,
        storage: firebaseStorage,
        isConfigured,
        error: initializationError,
      }
    }

    // Get Firebase configuration
    const { config, usingRealConfig } = getFirebaseConfig()
    isConfigured = usingRealConfig

    // Initialize Firebase only if it hasn't been initialized yet
    if (!getApps().length) {
      console.log("🔥 Initializing Firebase app...")
      firebaseApp = initializeApp(config)
    } else {
      console.log("🔥 Firebase already initialized, getting existing app")
      firebaseApp = getApps()[0]
    }

    // Initialize Firebase services
    firebaseAuth = getAuth(firebaseApp)
    firebaseDb = getFirestore(firebaseApp)
    firebaseStorage = getStorage(firebaseApp)

    if (!isConfigured) {
      initializationError = "Using demo configuration - authentication features limited"
      console.warn("⚠️ Firebase using demo configuration")
    } else {
      console.log("✅ Firebase initialized with real configuration")
    }

    return {
      app: firebaseApp,
      auth: firebaseAuth,
      db: firebaseDb,
      storage: firebaseStorage,
      isConfigured,
      error: initializationError,
    }
  } catch (error: any) {
    console.error("❌ Error initializing Firebase:", error)
    initializationError = error.message || "Failed to initialize Firebase"
    isConfigured = false

    return {
      app: null,
      auth: null,
      db: null,
      storage: null,
      isConfigured: false,
      error: initializationError,
    }
  }
}

// Initialize on module load
const firebase = initializeFirebaseSafe()

// Export Firebase instances
export const app = firebase.app
export const auth = firebase.auth
export const db = firebase.db
export const storage = firebase.storage

// REQUIRED EXPORTS
export const isFirebaseConfigured = firebase.isConfigured
export const firebaseError = firebase.error

// Helper function to check if Firebase is configured
export const checkFirebaseConfiguration = () => {
  return {
    isConfigured: firebase.isConfigured,
    error: firebase.error,
    hasApp: !!firebase.app,
    hasAuth: !!firebase.auth,
    hasDb: !!firebase.db,
    hasStorage: !!firebase.storage,
  }
}

// Default export
export default firebase.app
