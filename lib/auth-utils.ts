import type { NextRequest } from "next/server"
import { verifyIdToken as firebaseVerifyIdToken } from "@/lib/firebase-admin"

export async function verifyIdToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ [Auth Utils] Missing or invalid authorization header")
      return null
    }

    const token = authHeader.split("Bearer ")[1]
    if (!token) {
      console.error("❌ [Auth Utils] No token found in authorization header")
      return null
    }

    const decodedToken = await firebaseVerifyIdToken(token)
    console.log(`✅ [Auth Utils] Token verified for user: ${decodedToken.uid}`)
    return decodedToken
  } catch (error) {
    console.error("❌ [Auth Utils] Token verification failed:", error)
    return null
  }
}
