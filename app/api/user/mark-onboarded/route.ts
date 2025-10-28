import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { headers } from "next/headers"

initializeFirebaseAdmin()

async function getAuthUser(request: NextRequest) {
  try {
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization?.startsWith("Bearer ")) {
      return null
    }

    const token = authorization.split("Bearer ")[1]
    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("Auth error:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const uid = authUser.uid

    // Update user document to mark as onboarded
    const userRef = db.collection("users").doc(uid)
    await userRef.update({
      isNewUser: false,
      updatedAt: new Date(),
    })

    console.log(`✅ Marked user ${uid} as onboarded`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking user as onboarded:", error)
    return NextResponse.json({ error: "Failed to mark user as onboarded" }, { status: 500 })
  }
}
