import { getAuth } from "firebase-admin/auth"
import { getApps, initializeApp, cert } from "firebase-admin/app"
import { cookies } from "next/headers"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const adminAuth = getAuth()

export const auth = {
  async getCurrentUser() {
    try {
      const cookieStore = cookies()
      const sessionCookie = cookieStore.get("session")

      if (!sessionCookie) {
        return null
      }

      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie.value, true)
      return await adminAuth.getUser(decodedClaims.uid)
    } catch (error) {
      console.error("Error getting current user:", error)
      return null
    }
  },

  async verifyIdToken(idToken: string) {
    try {
      return await adminAuth.verifyIdToken(idToken)
    } catch (error) {
      console.error("Error verifying ID token:", error)
      return null
    }
  },

  async createSessionCookie(idToken: string, expiresIn: number = 60 * 60 * 24 * 5 * 1000) {
    try {
      return await adminAuth.createSessionCookie(idToken, { expiresIn })
    } catch (error) {
      console.error("Error creating session cookie:", error)
      return null
    }
  },

  async revokeRefreshTokens(uid: string) {
    try {
      await adminAuth.revokeRefreshTokens(uid)
    } catch (error) {
      console.error("Error revoking refresh tokens:", error)
    }
  },
}
