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

    const { userId, email, daysUntilExpiration } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing userId or email" }, { status: 400 })
    }

    const currentPeriodEnd = new Date()
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + (daysUntilExpiration || 30))

    // Create membership document
    await db
      .collection("memberships")
      .doc(userId)
      .set({
        uid: userId,
        email: email,
        plan: "creator_pro",
        status: "active",
        isActive: true,
        stripeCustomerId: `test_cus_${userId}`,
        stripeSubscriptionId: `test_sub_${userId}`,
        currentPeriodEnd: currentPeriodEnd,
        priceId: "test_price_id",
        downloadsUsed: 0,
        bundlesCreated: 0,
        features: {
          unlimitedDownloads: true,
          premiumContent: true,
          noWatermark: true,
          prioritySupport: true,
          platformFeePercentage: 10,
          maxVideosPerBundle: null,
          maxBundles: null,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

    console.log(`[Admin] Created test subscription for user ${userId}, expires ${currentPeriodEnd.toISOString()}`)

    return NextResponse.json({
      success: true,
      message: "Test subscription created successfully",
      currentPeriodEnd: currentPeriodEnd.toISOString(),
    })
  } catch (error) {
    console.error("[Admin] Error creating test subscription:", error)
    return NextResponse.json(
      {
        error: "Failed to create test subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
