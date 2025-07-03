import type { NextRequest } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

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
 * Verify Firebase ID token from request headers
 */
export async function verifyIdToken(request: NextRequest): Promise<DecodedToken | null> {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Auth] No valid authorization header found")
      return null
    }

    const idToken = authHeader.split("Bearer ")[1]
    if (!idToken) {
      console.log("❌ [Auth] No ID token found in authorization header")
      return null
    }

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    console.log(`✅ [Auth] Token verified for user: ${decodedToken.uid}`)

    return decodedToken as DecodedToken
  } catch (error) {
    console.error("❌ [Auth] Token verification failed:", error)
    return null
  }
}

/**
 * Get user data from Firestore
 */
export async function getUserData(uid: string) {
  try {
    const userDoc = await db.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      console.log(`❌ [Auth] User document not found: ${uid}`)
      return null
    }

    const userData = userDoc.data()
    console.log(`✅ [Auth] User data retrieved: ${uid}`)

    return {
      id: userDoc.id,
      ...userData,
    }
  } catch (error) {
    console.error(`❌ [Auth] Error getting user data for ${uid}:`, error)
    return null
  }
}

/**
 * Check if user owns a resource
 */
export async function verifyResourceOwnership(
  uid: string,
  collection: string,
  resourceId: string,
  ownerField = "creatorId",
): Promise<boolean> {
  try {
    const resourceDoc = await db.collection(collection).doc(resourceId).get()
    if (!resourceDoc.exists) {
      console.log(`❌ [Auth] Resource not found: ${collection}/${resourceId}`)
      return false
    }

    const resourceData = resourceDoc.data()
    const isOwner = resourceData?.[ownerField] === uid

    console.log(
      `${isOwner ? "✅" : "❌"} [Auth] Ownership check: ${uid} ${isOwner ? "owns" : "does not own"} ${collection}/${resourceId}`,
    )

    return isOwner
  } catch (error) {
    console.error(`❌ [Auth] Error checking ownership for ${collection}/${resourceId}:`, error)
    return false
  }
}

/**
 * Verify user has required permissions
 */
export async function verifyUserPermissions(uid: string, requiredPermissions: string[]): Promise<boolean> {
  try {
    const userData = await getUserData(uid)
    if (!userData) {
      return false
    }

    const userPermissions = userData.permissions || []
    const hasAllPermissions = requiredPermissions.every((permission) => userPermissions.includes(permission))

    console.log(
      `${hasAllPermissions ? "✅" : "❌"} [Auth] Permission check: ${uid} ${hasAllPermissions ? "has" : "lacks"} required permissions`,
    )

    return hasAllPermissions
  } catch (error) {
    console.error(`❌ [Auth] Error checking permissions for ${uid}:`, error)
    return false
  }
}

/**
 * Check if user is admin
 */
export async function isAdmin(uid: string): Promise<boolean> {
  try {
    const userData = await getUserData(uid)
    const isUserAdmin = userData?.role === "admin" || userData?.isAdmin === true

    console.log(`${isUserAdmin ? "✅" : "❌"} [Auth] Admin check: ${uid} ${isUserAdmin ? "is" : "is not"} admin`)

    return isUserAdmin
  } catch (error) {
    console.error(`❌ [Auth] Error checking admin status for ${uid}:`, error)
    return false
  }
}

/**
 * Verify user has active subscription
 */
export async function verifyActiveSubscription(uid: string): Promise<boolean> {
  try {
    const userData = await getUserData(uid)
    if (!userData) {
      return false
    }

    const hasActiveSubscription =
      userData.subscriptionStatus === "active" || userData.plan === "premium" || userData.plan === "creator_pro"

    console.log(
      `${hasActiveSubscription ? "✅" : "❌"} [Auth] Subscription check: ${uid} ${hasActiveSubscription ? "has" : "lacks"} active subscription`,
    )

    return hasActiveSubscription
  } catch (error) {
    console.error(`❌ [Auth] Error checking subscription for ${uid}:`, error)
    return false
  }
}

/**
 * Create or update user session
 */
export async function createUserSession(uid: string, sessionData: Record<string, any>) {
  try {
    await db
      .collection("userSessions")
      .doc(uid)
      .set(
        {
          ...sessionData,
          lastActive: new Date(),
          createdAt: new Date(),
        },
        { merge: true },
      )

    console.log(`✅ [Auth] Session created/updated for user: ${uid}`)
  } catch (error) {
    console.error(`❌ [Auth] Error creating session for ${uid}:`, error)
    throw error
  }
}

/**
 * Get user session
 */
export async function getUserSession(uid: string) {
  try {
    const sessionDoc = await db.collection("userSessions").doc(uid).get()
    if (!sessionDoc.exists) {
      return null
    }

    return {
      id: sessionDoc.id,
      ...sessionDoc.data(),
    }
  } catch (error) {
    console.error(`❌ [Auth] Error getting session for ${uid}:`, error)
    return null
  }
}

/**
 * Delete user session
 */
export async function deleteUserSession(uid: string) {
  try {
    await db.collection("userSessions").doc(uid).delete()
    console.log(`✅ [Auth] Session deleted for user: ${uid}`)
  } catch (error) {
    console.error(`❌ [Auth] Error deleting session for ${uid}:`, error)
    throw error
  }
}
