import { NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getMembership } from "@/lib/memberships-service"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get membership data from the memberships collection
    const membership = await getMembership(userId)

    if (!membership) {
      return NextResponse.json({
        plan: "free",
        isActive: false,
        features: {
          unlimitedDownloads: false,
          premiumContent: false,
          noWatermark: false,
          prioritySupport: false,
        },
      })
    }

    return NextResponse.json({
      plan: membership.plan,
      isActive: membership.isActive,
      status: membership.status,
      features: membership.features,
      stripeCustomerId: membership.stripeCustomerId,
      stripeSubscriptionId: membership.stripeSubscriptionId,
      currentPeriodEnd: membership.currentPeriodEnd,
      downloadsUsed: membership.downloadsUsed,
      bundlesCreated: membership.bundlesCreated,
    })
  } catch (error) {
    console.error("Error fetching membership status:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
