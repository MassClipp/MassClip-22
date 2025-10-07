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
    const hasUsedFreeTrial = freeUser?.hasUsedFreeTrial === true

    // Get membership status
    const membership = await getMembership(userId)

    console.log("[v0] Trial Status - Membership data:", {
      exists: !!membership,
      status: membership?.status,
      plan: membership?.plan,
      currentPeriodEnd: membership?.currentPeriodEnd,
      hasUsedFreeTrial,
    })

    const hasActiveCreatorPro = membership?.status === "active" && membership?.plan === "creator_pro"

    if (!membership || (membership.status !== "trialing" && !hasActiveCreatorPro)) {
      return NextResponse.json({
        isOnTrial: false,
        daysRemaining: 0,
        trialEndDate: null,
        hasUsedFreeTrial,
        hasActiveCreatorPro: false,
      })
    }

    if (hasActiveCreatorPro) {
      return NextResponse.json({
        isOnTrial: false,
        daysRemaining: 0,
        trialEndDate: null,
        hasUsedFreeTrial: true, // They've effectively "used" the trial by having active subscription
        hasActiveCreatorPro: true,
      })
    }

    const now = new Date()
    let trialEndDate: Date | null = null

    if (membership.currentPeriodEnd) {
      // Check if it's a Firestore Timestamp object
      if (typeof membership.currentPeriodEnd === "object" && "toDate" in membership.currentPeriodEnd) {
        trialEndDate = (membership.currentPeriodEnd as any).toDate()
      } else if (membership.currentPeriodEnd instanceof Date) {
        trialEndDate = membership.currentPeriodEnd
      } else if (typeof membership.currentPeriodEnd === "object" && "_seconds" in membership.currentPeriodEnd) {
        // Handle Firestore Timestamp with _seconds property
        trialEndDate = new Date((membership.currentPeriodEnd as any)._seconds * 1000)
      }
    }

    const daysRemaining = trialEndDate ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0

    console.log("[v0] Trial Status - Calculated:", {
      trialEndDate,
      daysRemaining,
      isOnTrial: true,
      hasUsedFreeTrial,
      hasActiveCreatorPro: false,
    })

    return NextResponse.json({
      isOnTrial: true,
      daysRemaining: Math.max(0, daysRemaining),
      trialEndDate: trialEndDate,
      hasUsedFreeTrial,
      hasActiveCreatorPro: false,
    })
  } catch (error) {
    console.error("[Trial Status] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
