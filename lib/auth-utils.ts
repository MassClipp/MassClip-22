import type { NextRequest } from "next/server"
import { auth } from "firebase-admin"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error)
  }
}

export async function verifyIdToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No valid authorization header found")
      return null
    }

    const idToken = authHeader.split("Bearer ")[1]

    if (!idToken) {
      console.log("No ID token found in authorization header")
      return null
    }

    // Verify the ID token
    const decodedToken = await auth().verifyIdToken(idToken)
    console.log(`✅ Token verified for user: ${decodedToken.uid}`)

    return decodedToken
  } catch (error) {
    console.error("❌ Token verification failed:", error)
    return null
  }
}

export async function requireAuth(request: NextRequest) {
  const decodedToken = await verifyIdToken(request)

  if (!decodedToken) {
    throw new Error("Authentication required")
  }

  return decodedToken
}
