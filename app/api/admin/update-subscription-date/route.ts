import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

initializeFirebaseAdmin()
const auth = getAuth()

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.replace("Bearer ", "")
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const { userId, currentPeriodEnd } = await request.json()

    if (!userId || !currentPeriodEnd) {
      return NextResponse.json({ error: "Missing userId or currentPeriodEnd" }, { status: 400 })
    }

    const newEndDate = new Date(currentPeriodEnd)

    // Update memberships document
    await db.collection("memberships").doc(userId).update({
      currentPeriodEnd: newEndDate,
      updatedAt: new Date(),
    })

    console.log(`[Admin] Updated subscription end date for user ${userId} to ${newEndDate.toISOString()}`)

    return NextResponse.json({
      success: true,
      message: "Subscription end date updated successfully",
      currentPeriodEnd: newEndDate.toISOString(),
    })
  } catch (error) {
    console.error("[Admin] Error updating subscription date:", error)
    return NextResponse.json(
      {
        error: "Failed to update subscription date",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
