import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { UserTrackingService } from "@/lib/user-tracking-service"

initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { uid, email, geoLocation, referralCodeUsed } = body as {
      uid?: string
      email?: string
      geoLocation?: string
      referralCodeUsed?: string
    }

    if (!uid || !email) {
      return NextResponse.json({ error: "Missing required fields: uid and email" }, { status: 400 })
    }

    // Verify the user exists in Firebase Auth
    const auth = getAuth()
    try {
      await auth.getUser(uid)
    } catch {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    // Extract best-effort IP from headers
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined

    const result = await UserTrackingService.ensureFreeUserForNonPro(uid, email, {
      ipAddress: ip,
      geoLocation,
      referralCodeUsed,
    })

    return NextResponse.json({
      success: true,
      ensured: result.ensured,
      reason: result.reason,
      message: result.ensured
        ? "freeUsers record ensured/updated."
        : "User is Creator Pro and active; no freeUsers record needed.",
    })
  } catch (error) {
    console.error("❌ Error ensuring free user record:", error)
    return NextResponse.json({ error: "Failed to ensure free user record" }, { status: 500 })
  }
}
