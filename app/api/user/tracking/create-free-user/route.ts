import { type NextRequest, NextResponse } from "next/server"
import { UserTrackingService } from "@/lib/user-tracking-service"
import { getAuth } from "firebase-admin/auth"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"

initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, email, ipAddress, geoLocation, referralCodeUsed } = body

    if (!uid || !email) {
      return NextResponse.json(
        { error: "Missing required fields: uid and email" },
        { status: 400 }
      )
    }

    // Verify the user exists in Firebase Auth
    const auth = getAuth()
    try {
      await auth.getUser(uid)
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      )
    }

    // Create free user record
    await UserTrackingService.createFreeUser({
      uid,
      email,
      ipAddress,
      geoLocation,
      referralCodeUsed,
    })

    return NextResponse.json({
      success: true,
      message: "Free user record created successfully",
    })
  } catch (error) {
    console.error("❌ Error creating free user record:", error)
    return NextResponse.json(
      { error: "Failed to create free user record" },
      { status: 500 }
    )
  }
}
