import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No authorization token" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    const userDoc = await db.collection("users").doc(uid).get()
    const userData = userDoc.data()

    // Consider user first-time if:
    // 1. No user document exists, OR
    // 2. User document exists but has no lastLoginAt field, OR
    // 3. User was created very recently (within last 5 minutes)
    const now = new Date()
    const createdAt = userData?.createdAt?.toDate()
    const lastLoginAt = userData?.lastLoginAt

    const isFirstTime =
      !userDoc.exists || !lastLoginAt || (createdAt && now.getTime() - createdAt.getTime() < 5 * 60 * 1000)

    // Update lastLoginAt for future checks
    if (userDoc.exists) {
      await db.collection("users").doc(uid).update({
        lastLoginAt: new Date(),
      })
    }

    return NextResponse.json({
      isFirstTime,
      hasProfile: userDoc.exists,
      createdRecently: createdAt && now.getTime() - createdAt.getTime() < 5 * 60 * 1000,
    })
  } catch (error) {
    console.error("Error checking first-time user status:", error)
    return NextResponse.json({ error: "Failed to check user status" }, { status: 500 })
  }
}
