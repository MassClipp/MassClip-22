import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

function isBuildTime(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-export" ||
    process.env.CI === "true"
  )
}

let adminApp: any = null
let adminDb: any = null
let adminAuth: any = null

export function getFirebaseAdmin() {
  if (isBuildTime()) {
    console.log("⏭️  [Firebase Server] Skipping initialization during build time")
    return {
      app: null,
      db: null,
      auth: null,
    }
  }

  if (!adminApp) {
    try {
      // Check if Firebase Admin is already initialized
      const existingApps = getApps()
      if (existingApps.length > 0) {
        adminApp = existingApps[0]
      } else {
        // Initialize Firebase Admin
        const projectId = process.env.FIREBASE_PROJECT_ID
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

        if (!projectId || !clientEmail || !privateKey) {
          throw new Error("Missing Firebase Admin credentials")
        }

        adminApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          projectId,
        })
      }

      adminDb = getFirestore(adminApp)
      adminAuth = getAuth(adminApp)
      console.log("✅ Firebase Admin initialized successfully")
    } catch (error) {
      console.error("❌ Firebase Admin initialization failed:", error)
      throw error
    }
  }

  return { app: adminApp, db: adminDb, auth: adminAuth }
}

export function getAdminDb() {
  const { db } = getFirebaseAdmin()
  return db
}

export function getAdminAuth() {
  const { auth } = getFirebaseAdmin()
  return auth
}

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (isBuildTime()) {
    console.log("⏭️  [Firebase Server] Skipping initializeFirebaseAdmin during build time")
    return
  }

  if (getApps().length === 0) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

      if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
        throw new Error("Missing required Firebase Admin environment variables")
      }

      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      })

      console.log("✅ Firebase Admin initialized successfully")
    } catch (error) {
      console.error("❌ Firebase Admin initialization failed:", error)
      throw error
    }
  }
}

export const db = new Proxy({} as any, {
  get(target, prop) {
    const { db } = getFirebaseAdmin()
    if (!db) return undefined
    return db[prop]
  },
})

export const auth = new Proxy({} as any, {
  get(target, prop) {
    const { auth } = getFirebaseAdmin()
    if (!auth) return undefined
    return auth[prop]
  },
})

// For compatibility with existing code
export default {
  get app() {
    return getFirebaseAdmin().app
  },
  get db() {
    return getFirebaseAdmin().db
  },
  get auth() {
    return getFirebaseAdmin().auth
  },
}

export { initializeFirebaseAdmin }
