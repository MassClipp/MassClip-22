import { type NextRequest, NextResponse } from "next/server"
import { UserTrackingService } from "@/lib/user-tracking-service"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"

initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      uid,
      stripeCustomerId,
      subscriptionId,
      email,
      tier = "creator_pro",
      promotionCodeUsed,
      totalPaid,
      ipAddress,
      geoLocation,
      paymentMethodLast4,
      revenueSplit,
    } = body

    if (!uid || !stripeCustomerId || !subscriptionId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await UserTrackingService.upgradeToCreatorPro(uid, stripeCustomerId, subscriptionId, email, {
      tier,
      promotionCodeUsed,
      totalPaid,
      ipAddress,
      geoLocation,
      paymentMethodLast4,
      revenueSplit,
      subscriptionStatus: "active",
    })

    return NextResponse.json({
      success: true,
      message: "User soft-upgraded to Creator Pro",
    })
  } catch (error) {
    console.error("❌ Error upgrading user to Creator Pro:", error)
    return NextResponse.json({ error: "Failed to upgrade user" }, { status: 500 })
  }
}
