import { type NextRequest, NextResponse } from "next/server"
import { verifyIdTokenFromRequest } from "@/lib/auth-utils"

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string
    email?: string
    email_verified?: boolean
    name?: string
    picture?: string
  }
}

/**
 * Middleware to protect API routes with authentication
 */
export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      const decodedToken = await verifyIdTokenFromRequest(req)

      if (!decodedToken) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      // Add user info to request
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        email_verified: decodedToken.email_verified,
        name: decodedToken.name,
        picture: decodedToken.picture,
      }

      return handler(authenticatedReq)
    } catch (error) {
      console.error("Auth middleware error:", error)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  }
}

/**
 * Middleware to protect API routes with role-based access
 */
export function withRole(roles: string[], handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Get user role from database
      const userRole = await getUserRole(req.user!.uid)

      if (!roles.includes(userRole)) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }

      return handler(req)
    } catch (error) {
      console.error("Role middleware error:", error)
      return NextResponse.json({ error: "Authorization failed" }, { status: 403 })
    }
  })
}

/**
 * Get user role from database
 */
async function getUserRole(uid: string): Promise<string> {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin")
    const db = getAdminDb()

    const userDoc = await db.collection("users").doc(uid).get()

    if (!userDoc.exists) {
      return "user" // Default role
    }

    const userData = userDoc.data()
    return userData?.role || "user"
  } catch (error) {
    console.error("Error getting user role:", error)
    return "user"
  }
}
