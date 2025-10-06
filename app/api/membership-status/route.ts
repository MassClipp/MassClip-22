import { NextResponse, type NextRequest } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getStripeSubscriptionStatus } from "@/lib/stripe-subscription-service"
import { getAuth } from "firebase-admin/auth"
import { getMembership } from "@/lib/memberships-service"

initializeFirebaseAdmin()
const auth = getAuth()

export async function GET(request: NextRequest) {
  try {
    // Get userId from auth token
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.replace("Bearer ", "")
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get membership from the memberships service
    const membership = await getMembership(userId)

    if (!membership) {
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

    // Check if user is on trial or has active Creator Pro
    const isCreatorPro = membership.plan === "creator_pro" || membership.status === "trialing"
    const platformFee = isCreatorPro ? 10 : 20

    return NextResponse.json({
      plan: membership.plan,
      isActive: membership.status === "active" || membership.status === "trialing",
      status: membership.status,
      currentPeriodEnd: membership.currentPeriodEnd,
      cancelAtPeriodEnd: membership.cancelAtPeriodEnd,
      features: {
        unlimitedDownloads: isCreatorPro,
        premiumContent: isCreatorPro,
        noWatermark: isCreatorPro,
        prioritySupport: isCreatorPro,
        platformFeePercentage: platformFee,
        maxVideosPerBundle: isCreatorPro ? null : 10,
        maxBundles: isCreatorPro ? null : 2,
      },
    })
  } catch (error) {
    console.error("Error fetching membership status:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

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
