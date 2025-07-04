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
    identities: {
      [key: string]: any
    }
    sign_in_provider: string
  }
}

/**
 * Verify Firebase ID token from request headers
 */
export async function verifyIdToken(request: NextRequest): Promise<DecodedToken | null> {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No authorization header found")
      return null
    }

    const token = authHeader.substring(7)

    if (!token) {
      console.log("No token found in authorization header")
      return null
    }

    const decodedToken = await auth.verifyIdToken(token)
    return decodedToken as DecodedToken
  } catch (error) {
    console.error("Error verifying ID token:", error)
    return null
  }
}

/**
 * Require authentication for API routes
 */
export async function requireAuth(request: NextRequest): Promise<DecodedToken> {
  const decodedToken = await verifyIdToken(request)

  if (!decodedToken) {
    throw new Error("Authentication required")
  }

  return decodedToken
}

/**
 * Check if user is authenticated (returns boolean)
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const decodedToken = await verifyIdToken(request)
  return !!decodedToken
}

/**
 * Get user ID from request
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  const decodedToken = await verifyIdToken(request)
  return decodedToken?.uid || null
}

/**
 * Extract token from request headers
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  return authHeader.substring(7)
}

/**
 * Validate token format
 */
export function isValidTokenFormat(token: string): boolean {
  // Firebase tokens are JWTs with 3 parts separated by dots
  const parts = token.split(".")
  return parts.length === 3 && parts.every((part) => part.length > 0)
}

/**
 * Get user claims from token
 */
export async function getUserClaims(request: NextRequest): Promise<any> {
  const decodedToken = await verifyIdToken(request)
  return decodedToken || {}
}

/**
 * Check if user has specific claim
 */
export async function hasUserClaim(request: NextRequest, claimName: string, claimValue?: any): Promise<boolean> {
  const decodedToken = await verifyIdToken(request)

  if (!decodedToken) {
    return false
  }

  const claims = decodedToken as any

  if (claimValue === undefined) {
    return claimName in claims
  }

  return claims[claimName] === claimValue
}

/**
 * Error class for authentication errors
 */
export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message)
    this.name = "AuthenticationError"
  }
}

/**
 * Error class for authorization errors
 */
export class AuthorizationError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message)
    this.name = "AuthorizationError"
  }
}
