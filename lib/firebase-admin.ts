import admin from "firebase-admin"
import { getApps } from "firebase-admin/app"

let app: admin.app.App

const getFirebaseAdmin = () => {
  if (!getApps().length) {
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    })
  } else {
    app = getApps()[0]
  }

  return app
}

// Authentication
const auth = getFirebaseAdmin().auth()

// Firestore
const db = getFirebaseAdmin().firestore()

export { getFirebaseAdmin, auth, db }

// Additional exports for compatibility
export const adminAuth = auth
export const adminDb = db
