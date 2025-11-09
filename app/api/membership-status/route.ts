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

    console.log("[v0] Membership status check for user:", userId.substring(0, 8))

    // Get membership from the memberships service
    const membership = await getMembership(userId)

    console.log("[v0] Membership data from service:", {
      exists: !!membership,
      plan: membership?.plan,
      status: membership?.status,
    })

    if (!membership) {
      const starterLimits = await getFreeUserLimits(userId)

      return NextResponse.json({
        plan: "starter",
        membershipTier: "starter",
        isActive: false,
        status: "inactive",
        membershipStatus: "inactive",
        features: {
          platformFeePercentage: 20,
          maxVideosPerBundle: starterLimits.maxVideosPerBundle,
          maxBundles: starterLimits.bundlesLimit,
        },
      })
    }

    const isFacelessprenuer = membership.plan === "facelessprenuer"
    const isCreatorPro = membership.plan === "creator_pro" || membership.status === "trialing"
    const isFacelessPro = membership.plan === "faceless_pro"

    const hasUnlimited = isFacelessprenuer || isCreatorPro
    const platformFee = isFacelessPro ? 15 : hasUnlimited ? 10 : 20

    let maxVideosPerBundle: number | null = null
    let maxBundles: number | null = null

    if (hasUnlimited) {
      maxVideosPerBundle = null
      maxBundles = null
    } else if (isFacelessPro) {
      maxVideosPerBundle = 25
      maxBundles = 5
    } else {
      const starterLimits = await getFreeUserLimits(userId)
      maxVideosPerBundle = starterLimits.maxVideosPerBundle
      maxBundles = starterLimits.bundlesLimit
    }

    const now = new Date()
    const currentPeriodEnd = membership.currentPeriodEnd
      ? typeof membership.currentPeriodEnd === "object" && "toDate" in membership.currentPeriodEnd
        ? (membership.currentPeriodEnd as any).toDate()
        : membership.currentPeriodEnd instanceof Date
          ? membership.currentPeriodEnd
          : new Date(membership.currentPeriodEnd)
      : null

    const isInGracePeriod = membership.cancelAtPeriodEnd && currentPeriodEnd && currentPeriodEnd > now
    const isActive = membership.status === "active" || membership.status === "trialing" || isInGracePeriod

    console.log("[v0] Final membership status:", {
      plan: membership.plan,
      membershipTier: membership.plan,
      isActive,
      status: membership.status,
      membershipStatus: membership.status,
    })

    return NextResponse.json({
      plan: membership.plan,
      membershipTier: membership.plan, // Add this for compatibility
      isActive,
      status: membership.status,
      membershipStatus: membership.status, // Add this for compatibility
      currentPeriodEnd: membership.currentPeriodEnd,
      cancelAtPeriodEnd: membership.cancelAtPeriodEnd,
      features: {
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
          const platformFee = isFacelessPro ? 15 : hasUnlimited ? 10 : 20

          let maxVideosPerBundle: number | null = null
          let maxBundles: number | null = null

          if (hasUnlimited) {
            maxVideosPerBundle = null
            maxBundles = null
          } else if (isFacelessPro) {
            maxVideosPerBundle = 25
            maxBundles = 5
          } else {
            const starterLimits = await getFreeUserLimits(userId)
            maxVideosPerBundle = starterLimits.maxVideosPerBundle
            maxBundles = starterLimits.bundlesLimit
          }

          return NextResponse.json({
            plan: membership.plan,
            membershipTier: membership.plan, // Add this for compatibility
            isActive: true, // Still active during grace period
            status: "canceled",
            membershipStatus: "canceled", // Add this for compatibility
            currentPeriodEnd: membership.currentPeriodEnd,
            cancelAtPeriodEnd: true,
            features: {
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
        membershipTier: "free", // Add this for compatibility
        isActive: false,
        status: "inactive",
        membershipStatus: "inactive", // Add this for compatibility
        features: {
          platformFeePercentage: 20,
          maxVideosPerBundle: 10,
          maxBundles: 2,
        },
      })
    }

    return NextResponse.json({
      plan: stripeStatus.plan,
      membershipTier: stripeStatus.plan, // Add this for compatibility
      isActive: stripeStatus.isActive,
      status: stripeStatus.status,
      membershipStatus: stripeStatus.status, // Add this for compatibility
      currentPeriodEnd: stripeStatus.currentPeriodEnd,
      cancelAtPeriodEnd: stripeStatus.cancelAtPeriodEnd,
      features: {
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
