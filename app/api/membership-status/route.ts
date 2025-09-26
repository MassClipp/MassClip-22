import { NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getStripeSubscriptionStatus } from "@/lib/stripe-subscription-service"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    const stripeStatus = await getStripeSubscriptionStatus(userId)

    if (!stripeStatus.isActive) {
      return NextResponse.json({
        plan: "free",
        isActive: false,
        status: "inactive",
        features: {
          unlimitedDownloads: false,
          premiumContent: false,
          noWatermark: false,
          prioritySupport: false,
          platformFeePercentage: 20,
          maxVideosPerBundle: 10,
          maxBundles: 2,
        },
      })
    }

    return NextResponse.json({
      plan: stripeStatus.plan,
      isActive: stripeStatus.isActive,
      status: stripeStatus.status,
      currentPeriodEnd: stripeStatus.currentPeriodEnd,
      cancelAtPeriodEnd: stripeStatus.cancelAtPeriodEnd,
      features: {
        unlimitedDownloads: true,
        premiumContent: true,
        noWatermark: true,
        prioritySupport: true,
        platformFeePercentage: 10,
        maxVideosPerBundle: null,
        maxBundles: null,
      },
    })
  } catch (error) {
    console.error("Error fetching membership status:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
