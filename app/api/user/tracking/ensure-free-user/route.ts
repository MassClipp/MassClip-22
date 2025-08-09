import { type NextRequest, NextResponse } from "next/server"
import { UserTrackingService } from "@/lib/user-tracking-service"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"

initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, email, ipAddress, geoLocation, referralCodeUsed } = body || {}

    if (!uid || typeof email === "undefined") {
      return NextResponse.json({ error: "Missing uid or email" }, { status: 400 })
    }

    const result = await UserTrackingService.ensureFreeUserForNonPro(uid, email, {
      ipAddress,
      geoLocation,
      referralCodeUsed,
    })

    return NextResponse.json({
      success: true,
      ensured: result.ensured,
      reason: result.reason,
      message: result.ensured
        ? "Ensured freeUsers record for non-pro user"
        : "User is active Creator Pro; no freeUsers changes",
    })
  } catch (error) {
    console.error("❌ Error ensuring free user:", error)
    return NextResponse.json({ error: "Failed to ensure free user" }, { status: 500 })
  }
}
