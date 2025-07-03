import { auth } from "@/lib/firebase-admin"
import type { NextRequest } from "next/server"

export interface DecodedToken {
  uid: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  iss: string
  aud: string
  auth_time: number
  user_id: string
  sub: string
  iat: number
  exp: number
  firebase: {
    identities: Record<string, any>
    sign_in_provider: string
  }
}

/**
 * Verify Firebase ID token from Authorization header
 */
export async function verifyIdToken(request: NextRequest): Promise<DecodedToken | null> {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const idToken = authHeader.substring(7) // Remove 'Bearer ' prefix
    if (!idToken) {
      return null
    }

    // Verify the ID token using Firebase Admin SDK
    const decodedToken = await auth.verifyIdToken(idToken)
    return decodedToken as DecodedToken
  } catch (error) {
    console.error("Error verifying ID token:", error)
    return null
  }
}

/**
 * Extract user ID from Authorization header
 */
export async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
  const decodedToken = await verifyIdToken(request)
  return decodedToken?.uid || null
}

/**
 * Verify user authentication and return user ID
 */
export async function requireAuth(request: NextRequest): Promise<string> {
  const userId = await getUserIdFromToken(request)
  if (!userId) {
    throw new Error("Authentication required")
  }
  return userId
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const userId = await getUserIdFromToken(request)
  return !!userId
}
