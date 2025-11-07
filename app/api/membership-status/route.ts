import { NextResponse, type NextRequest } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getStripeSubscriptionStatus } from "@/lib/stripe-subscription-service"
import { getAuth } from "firebase-admin/auth"
import { getMembership } from "@/lib/memberships-service"
import { getFreeUserLimits } from "@/lib/free-users-service"

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
      const starterLimits = await getFreeUserLimits(userId)

      return NextResponse.json({
        plan: "starter",
        isActive: false,
        status: "inactive",
        features: {
          unlimitedDownloads: false,
          premiumContent: false,
          noWatermark: false,
          prioritySupport: false,
          platformFeePercentage: 20,
          maxVideosPerBundle: starterLimits.maxVideosPerBundle, // 15 for Starter
          maxBundles: starterLimits.bundlesLimit, // 5 for Starter
        },
      })
    }

    const isFacelessprenuer = membership.plan === "facelessprenuer"
    const isCreatorPro = membership.plan === "creator_pro" || membership.status === "trialing"
    const isFacelessPro = membership.plan === "faceless_pro"

    // Facelessprenuer and Creator Pro get 10% fee and unlimited
    const hasUnlimited = isFacelessprenuer || isCreatorPro
    const platformFee = hasUnlimited ? 10 : 20

    let maxVideosPerBundle: number | null = null
    let maxBundles: number | null = null

    if (hasUnlimited) {
      // Facelessprenuer and Creator Pro have unlimited
      maxVideosPerBundle = null
      maxBundles = null
    } else if (isFacelessPro) {
      // Faceless Pro has specific limits: 15 videos, 5 bundles, 20% fee
      maxVideosPerBundle = 15
      maxBundles = 5
    } else {
      // Starter plan - get actual limits (5 bundles, 15 videos per bundle)
      const starterLimits = await getFreeUserLimits(userId)
      maxVideosPerBundle = starterLimits.maxVideosPerBundle
      maxBundles = starterLimits.bundlesLimit
    }

    return NextResponse.json({
      plan: membership.plan,
      isActive: membership.status === "active" || membership.status === "trialing",
      status: membership.status,
      currentPeriodEnd: membership.currentPeriodEnd,
      cancelAtPeriodEnd: membership.cancelAtPeriodEnd,
      features: {
        unlimitedDownloads: hasUnlimited,
        premiumContent: hasUnlimited,
        noWatermark: hasUnlimited,
        prioritySupport: hasUnlimited,
        platformFeePercentage: platformFee,
        maxVideosPerBundle,
        maxBundles,
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

    initializeFirebaseAdmin()

    const stripeStatus = await getStripeSubscriptionStatus(userId)

    if (!stripeStatus.isActive) {
      // Check if user has a canceled subscription with grace period access
      const membership = await getMembership(userId)

      if (membership && membership.currentPeriodEnd) {
        const currentPeriodEndDate = new Date(membership.currentPeriodEnd)
        const now = new Date()

        // If still within grace period, return the actual plan with canceled status
        if (currentPeriodEndDate > now) {
          const isFacelessprenuer = membership.plan === "facelessprenuer"
          const isCreatorPro = membership.plan === "creator_pro"
          const isFacelessPro = membership.plan === "faceless_pro"

          const hasUnlimited = isFacelessprenuer || isCreatorPro
          const platformFee = hasUnlimited ? 10 : 20

          let maxVideosPerBundle: number | null = null
          let maxBundles: number | null = null

          if (hasUnlimited) {
            maxVideosPerBundle = null
            maxBundles = null
          } else if (isFacelessPro) {
            maxVideosPerBundle = 15
            maxBundles = 5
          } else {
            const starterLimits = await getFreeUserLimits(userId)
            maxVideosPerBundle = starterLimits.maxVideosPerBundle
            maxBundles = starterLimits.bundlesLimit
          }

          return NextResponse.json({
            plan: membership.plan,
            isActive: true, // Still active during grace period
            status: "canceled",
            currentPeriodEnd: membership.currentPeriodEnd,
            cancelAtPeriodEnd: true,
            features: {
              unlimitedDownloads: hasUnlimited,
              premiumContent: hasUnlimited,
              noWatermark: hasUnlimited,
              prioritySupport: hasUnlimited,
              platformFeePercentage: platformFee,
              maxVideosPerBundle,
              maxBundles,
            },
          })
        }
      }

      // No active subscription and no grace period
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
