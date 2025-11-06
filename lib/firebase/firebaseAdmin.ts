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

export function initializeFirebaseAdmin() {
  if (isBuildTime()) {
    console.log("⏭️  [Firebase/firebaseAdmin] Skipping initialization during build time")
    return null
  }

  if (getApps().length > 0) {
    return getApps()[0]
  }

  const firebaseAdminConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }

  if (!firebaseAdminConfig.projectId || !firebaseAdminConfig.clientEmail || !firebaseAdminConfig.privateKey) {
    throw new Error("Missing Firebase Admin configuration")
  }

  adminApp = initializeApp({
    credential: cert(firebaseAdminConfig),
    projectId: firebaseAdminConfig.projectId,
  })

  return adminApp
}

const getApp = () => {
  if (isBuildTime()) return null
  return initializeFirebaseAdmin()
}

export const adminAuth = new Proxy({} as any, {
  get(target, prop) {
    const app = getApp()
    if (!app) return undefined
    const auth = getAuth(app)
    return auth[prop]
  },
})

export const adminDb = new Proxy({} as any, {
  get(target, prop) {
    const app = getApp()
    if (!app) return undefined
    const db = getFirestore(app)
    return db[prop]
  },
})

export const firestore = adminDb

// Legacy exports
export const auth = adminAuth
export const db = adminDb
