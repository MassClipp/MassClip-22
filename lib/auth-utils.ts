import type { NextRequest } from "next/server"
import { auth } from "@/lib/firebase-admin"
import type { DecodedIdToken } from "firebase-admin/auth"

export async function verifyIdToken(request: NextRequest): Promise<DecodedIdToken | null> {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("Error verifying ID token:", error)
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

export async function requireAuth(request: NextRequest) {
  const decodedToken = await verifyIdToken(request)
  if (!decodedToken) {
    throw new Error("Authentication required")
  }
  return decodedToken
}
