import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/firebase-admin"
import { getMembership } from "@/lib/memberships-service"
import { getFreeUser } from "@/lib/free-users-service"

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log("[v0] Trial Status - Checking for user:", userId.substring(0, 8) + "...")

    const freeUser = await getFreeUser(userId)
    let hasUsedFreeTrial = freeUser?.hasUsedFreeTrial === true

    // Get membership status (this will return null if trial has expired)
    const membership = await getMembership(userId)

    // Faceless Pro users should still be able to see the trial offer to upgrade
    const hasPurchasedFacelessprenuer = membership && membership?.plan === "facelessprenuer"

    const hasFacelessPro = membership && membership?.plan === "faceless_pro"

    const now = new Date()
    const currentPeriodEnd = membership?.currentPeriodEnd
      ? typeof membership.currentPeriodEnd === "object" && "toDate" in membership.currentPeriodEnd
        ? (membership.currentPeriodEnd as any).toDate()
        : membership.currentPeriodEnd instanceof Date
          ? membership.currentPeriodEnd
          : new Date(membership.currentPeriodEnd)
      : null

    const isInGracePeriod = membership?.cancelAtPeriodEnd && currentPeriodEnd && currentPeriodEnd > now

    const hasActivePaidPlan =
      (membership?.status === "active" || isInGracePeriod) &&
      (membership?.plan === "faceless_pro" ||
        membership?.plan === "facelessprenuer" ||
        membership?.plan === "creator_pro" ||
        membership?.plan === "creator_vip")

    // Only users who purchased Facelessprenuer have used the trial
    if (hasPurchasedFacelessprenuer) {
      hasUsedFreeTrial = true
    }

    console.log("[v0] Trial Status - Membership data:", {
      exists: !!membership,
      status: membership?.status,
      plan: membership?.plan,
      currentPeriodEnd: membership?.currentPeriodEnd,
      hasUsedFreeTrial,
      hasActivePaidPlan,
      hasPurchasedFacelessprenuer,
      hasFacelessPro,
      isInGracePeriod, // Added for debugging
    })

    if (hasActivePaidPlan) {
      console.log("[v0] Trial Status - User has active paid plan")
      return NextResponse.json({
        isOnTrial: false,
        daysRemaining: 0,
        trialEndDate: null,
        hasUsedFreeTrial, // Will be true only if they purchased Facelessprenuer
        hasActiveCreatorVIP: membership?.plan === "creator_vip",
        hasPurchasedFacelessprenuer,
        hasFacelessPro,
        isInGracePeriod: false, // Added for debugging
      })
    }

    if (!membership || membership.status !== "trialing") {
      return NextResponse.json({
        isOnTrial: false,
        daysRemaining: 0,
        trialEndDate: null,
        hasUsedFreeTrial,
        hasActiveCreatorVIP: false,
        hasPurchasedFacelessprenuer,
        hasFacelessPro,
        isInGracePeriod: false, // Added for debugging
      })
    }

    let trialEndDate: Date | null = null

    if (membership.currentPeriodEnd) {
      if (typeof membership.currentPeriodEnd === "object" && "toDate" in membership.currentPeriodEnd) {
        trialEndDate = (membership.currentPeriodEnd as any).toDate()
      } else if (membership.currentPeriodEnd instanceof Date) {
        trialEndDate = membership.currentPeriodEnd
      } else if (typeof membership.currentPeriodEnd === "object" && "_seconds" in membership.currentPeriodEnd) {
        trialEndDate = new Date((membership.currentPeriodEnd as any)._seconds * 1000)
      }
    }

    let daysRemaining = 0
    if (trialEndDate) {
      const timeRemaining = trialEndDate.getTime() - now.getTime()
      if (timeRemaining > 0) {
        const calculatedDays = timeRemaining / (1000 * 60 * 60 * 24)
        daysRemaining = Math.max(1, Math.ceil(calculatedDays))
      }
    }

    console.log("[v0] Trial Status - Calculated:", {
      trialEndDate,
      daysRemaining,
      isOnTrial: daysRemaining > 0,
      hasUsedFreeTrial,
      hasActiveCreatorVIP: membership?.plan === "creator_vip",
      hasPurchasedFacelessprenuer,
      hasFacelessPro,
      isInGracePeriod, // Added for debugging
    })

    return NextResponse.json({
      isOnTrial: daysRemaining > 0,
      daysRemaining: Math.max(0, daysRemaining),
      trialEndDate: trialEndDate,
      hasUsedFreeTrial,
      hasActiveCreatorVIP: membership?.plan === "creator_vip",
      hasPurchasedFacelessprenuer,
      hasFacelessPro,
      isInGracePeriod, // Added for debugging
    })
  } catch (error) {
    console.error("[Trial Status] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
