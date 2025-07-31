import { auth } from "@/lib/firebase-admin"
import type { NextRequest } from "next/server"
import { decodeToken } from "@/lib/auth"

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
 * Verify Firebase ID token directly from token string
 */
export async function verifyIdToken(token: string): Promise<DecodedToken | null> {
  try {
    if (!token) {
      console.error("❌ [Auth Utils] No token provided")
      return null
    }

    if (!isValidTokenFormat(token)) {
      console.error("❌ [Auth Utils] Invalid token format")
      return null
    }

    console.log("🔍 [Auth Utils] Verifying ID token...")
    const decodedToken = await auth.verifyIdToken(token)
    console.log("✅ [Auth Utils] ID token verified successfully for user:", decodedToken.uid)

    return decodedToken
  } catch (error: any) {
    console.error("❌ [Auth Utils] Failed to verify ID token:", error.message)
    return null
  }
}

/**
 * Verify Firebase ID token from request headers
 */
export async function verifyIdTokenFromRequest(request: NextRequest): Promise<DecodedToken | null> {
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

    const idToken = authHeader.split("Bearer ")[1]
    if (!idToken) {
      console.error("❌ [Auth Utils] No ID token found in authorization header")
      return null
    }

    return await verifyIdToken(idToken)
  } catch (error: any) {
    console.error("❌ [Auth Utils] Failed to verify ID token from request:", error.message)
    return null
  }
}

/**
 * Require authentication for API routes
 */
export async function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header required")
  }

  const token = authHeader.substring(7)

  if (!token) {
    throw new Error("Authentication token required")
  }

  try {
    const decodedToken = await decodeToken(token)
    return decodedToken
  } catch (error) {
    throw new Error("Invalid authentication token")
  }
}

/**
 * Check if user is authenticated (returns boolean)
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const decodedToken = await verifyIdTokenFromRequest(request)
  return !!decodedToken
}

/**
 * Get user ID from request
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  const decodedToken = await verifyIdTokenFromRequest(request)
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
  const decodedToken = await verifyIdTokenFromRequest(request)
  return decodedToken || {}
}

/**
 * Check if user has specific claim
 */
export async function hasUserClaim(request: NextRequest, claimName: string, claimValue?: any): Promise<boolean> {
  const decodedToken = await verifyIdTokenFromRequest(request)

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

/**
 * Get authenticated user ID
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<string | null> {
  const decodedToken = await verifyIdTokenFromRequest(request)
  return decodedToken ? decodedToken.uid : null
}

/**
 * Extract buyer token from request
 */
export async function extractBuyerToken(request: NextRequest): Promise<string | null> {
  // Try to get token from Authorization header
  const authHeader = request.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7)
  }

  // Try to get token from request body
  try {
    const body = await request.json()
    return body.buyerToken || body.idToken || null
  } catch {
    return null
  }
}
