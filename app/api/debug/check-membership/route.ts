import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    console.log("[v0] Checking membership for user:", userId)

    const membershipDoc = await db.collection("memberships").doc(userId).get()

    return NextResponse.json({
      exists: membershipDoc.exists,
      data: membershipDoc.data() || null,
      id: membershipDoc.id,
    })
  } catch (error) {
    console.error("[v0] Error checking membership:", error)
    return NextResponse.json(
      {
        error: "Failed to check membership",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
