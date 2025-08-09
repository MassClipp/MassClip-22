import { type NextRequest, NextResponse } from "next/server"
import { UserTrackingService } from "@/lib/user-tracking-service"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"

initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, email } = body

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 })
    }

    await UserTrackingService.downgradeToFree(uid, email)

    return NextResponse.json({
      success: true,
      message: "User soft-downgraded to Free",
    })
  } catch (error) {
    console.error("❌ Error downgrading user:", error)
    return NextResponse.json({ error: "Failed to downgrade user" }, { status: 500 })
  }
}
