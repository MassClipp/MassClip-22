import type { NextRequest } from "next/server"
import { auth } from "@/lib/firebase-admin"
import type { DecodedIdToken } from "firebase-admin/auth"

export async function verifyIdToken(request: NextRequest): Promise<DecodedIdToken | null> {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      console.error("❌ [Auth Utils] No authorization header found")
      return null
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.error("❌ [Auth Utils] Invalid authorization header format")
      return null
    }

    const token = authHeader.split("Bearer ")[1]

    if (!token) {
      console.error("❌ [Auth Utils] No token found in authorization header")
      return null
    }

    console.log("🔍 [Auth Utils] Verifying Firebase ID token...")

    const decodedToken = await auth.verifyIdToken(token)

    console.log(`✅ [Auth Utils] Token verified for user: ${decodedToken.uid}`)

    return decodedToken
  } catch (error) {
    console.error("❌ [Auth Utils] Token verification failed:", error)

    if (error instanceof Error) {
      // Log specific Firebase Auth errors
      if (error.message.includes("Firebase ID token has expired")) {
        console.error("❌ [Auth Utils] Token expired")
      } else if (error.message.includes("Firebase ID token has invalid signature")) {
        console.error("❌ [Auth Utils] Invalid token signature")
      } else if (error.message.includes("Firebase ID token has no 'kid' claim")) {
        console.error("❌ [Auth Utils] Invalid token format")
      }
    }

    return null
  }
}

export async function getAuthenticatedUser(request: NextRequest) {
  const decodedToken = await verifyIdToken(request)

  if (!decodedToken) {
    return {
      success: false,
      error: "Authentication required",
      status: 401,
    }
  }

  return {
    success: true,
    user: decodedToken,
    userId: decodedToken.uid,
  }
}

export function createAuthError(message = "Authentication required", status = 401) {
  return {
    error: message,
    code: "UNAUTHORIZED",
    status,
  }
}

export function createForbiddenError(message = "Access denied") {
  return {
    error: message,
    code: "FORBIDDEN",
    status: 403,
  }
}

// Helper to extract user ID from request headers
export async function extractUserId(request: NextRequest): Promise<string | null> {
  const decodedToken = await verifyIdToken(request)
  return decodedToken?.uid || null
}

// Helper to check if user owns a resource
export async function verifyResourceOwnership(
  request: NextRequest,
  resourceCreatorId: string,
): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const decodedToken = await verifyIdToken(request)

  if (!decodedToken) {
    return {
      authorized: false,
      error: "Authentication required",
    }
  }

  if (decodedToken.uid !== resourceCreatorId) {
    return {
      authorized: false,
      userId: decodedToken.uid,
      error: "Not authorized to access this resource",
    }
  }

  return {
    authorized: true,
    userId: decodedToken.uid,
  }
}
