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

    const { userId, trialEndDate } = await request.json()

    if (!userId || !trialEndDate) {
      return NextResponse.json({ error: "Missing userId or trialEndDate" }, { status: 400 })
    }

    const newEndDate = new Date(trialEndDate)

    // Update freeUsers document
    await db.collection("freeUsers").doc(userId).update({
      trialEndDate: newEndDate,
      updatedAt: new Date(),
    })

    // Update memberships document
    await db.collection("memberships").doc(userId).update({
      currentPeriodEnd: newEndDate,
      updatedAt: new Date(),
    })

    console.log(`[Admin] Updated trial end date for user ${userId} to ${newEndDate.toISOString()}`)

    return NextResponse.json({
      success: true,
      message: "Trial end date updated successfully",
      trialEndDate: newEndDate.toISOString(),
    })
  } catch (error) {
    console.error("[Admin] Error updating trial date:", error)
    return NextResponse.json(
      {
        error: "Failed to update trial date",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
