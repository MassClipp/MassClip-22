import { auth } from "@/lib/firebase-admin"
import type { NextRequest } from "next/server"

/**
 * A decoded Firebase ID token
 */
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
      [key: string]: unknown
    }
    sign_in_provider: string
  }
}

/* -------------------------------------------------------------------------- */
/*                               Core Helpers                                 */
/* -------------------------------------------------------------------------- */

/**
 * Extract the bearer token from the request headers (if present)
 */
function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? ""
  return header.startsWith("Bearer ") ? header.slice(7) : null
}

/**
 * Verify a Firebase ID token. Returns `null` if verification fails.
 */
export async function verifyIdToken(request: NextRequest): Promise<DecodedToken | null> {
  const token = getBearerToken(request)
  if (!token) return null

  try {
    const decoded = await auth.verifyIdToken(token)
    return decoded as DecodedToken
  } catch (err) {
    console.error("❌ [Auth Utils] Token verification failed:", err)
    return null
  }
}

/**
 * Throws if the request does not contain a valid, verifiable ID token.
 */
export async function requireAuth(request: NextRequest): Promise<DecodedToken> {
  const decoded = await verifyIdToken(request)
  if (!decoded) throw new Error("Authentication required")
  return decoded
}

/**
 * Convenience helper – `true` if the request carries a valid token.
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  return (await verifyIdToken(request)) !== null
}

/**
 * Get the authenticated user’s UID (or `null` if unauthenticated).
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  const decoded = await verifyIdToken(request)
  return decoded?.uid ?? null
}

/**
 * Check if the authenticated user has a specific custom claim.
 */
export async function hasUserClaim(request: NextRequest, claim: string, value?: unknown): Promise<boolean> {
  const decoded = await verifyIdToken(request)
  if (!decoded) return false

  const claims = decoded as Record<string, unknown>
  if (value === undefined) return claim in claims
  return claims[claim] === value
}

/* -------------------------------------------------------------------------- */
/*                                  Errors                                    */
/* -------------------------------------------------------------------------- */

export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message)
    this.name = "AuthenticationError"
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message)
    this.name = "AuthorizationError"
  }
}
