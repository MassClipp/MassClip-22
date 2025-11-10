import type { NextRequest } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"

export async function verifyAuth(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)

    return decodedToken.uid
  } catch (error) {
    console.error("[v0] Auth verification error:", error)
    return null
  }
}
