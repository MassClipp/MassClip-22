import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { headers } from "next/headers"

async function getUserIdFromHeader(): Promise<string | null> {
  const headersList = headers()
  const authorization = headersList.get("authorization")

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null
  }

  const token = authorization.split("Bearer ")[1]
  try {
    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken.uid
  } catch (error) {
    console.error("❌ [User Profile API] Token verification failed:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromHeader()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`🔍 [User Profile API] Fetching profile for user: ${userId}`)

    const doc = await db.collection("users").doc(userId).get()

    if (!doc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      profile: doc.data(),
    })
  } catch (error) {
    console.error("❌ [User Profile API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch user profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
