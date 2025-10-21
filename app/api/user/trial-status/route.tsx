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

    // Get membership status (this will return null if trial has expired)
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
        hasUsedFreeTrial: true,
        hasActiveCreatorPro: true,
      })
    }

    const now = new Date()
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

    // Calculate days remaining - if trial end date is in the past, return 0
    let daysRemaining = 0
    if (trialEndDate) {
      const timeRemaining = trialEndDate.getTime() - now.getTime()
      if (timeRemaining > 0) {
        // Round up to show full days (e.g., 2.1 days = 3 days)
        daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24))
      }
    }
    // </CHANGE>

    console.log("[v0] Trial Status - Calculated:", {
      trialEndDate,
      daysRemaining,
      isOnTrial: daysRemaining > 0,
      hasUsedFreeTrial,
      hasActiveCreatorPro: false,
    })

    return NextResponse.json({
      isOnTrial: daysRemaining > 0,
      daysRemaining: Math.max(0, daysRemaining),
      trialEndDate: trialEndDate,
      hasUsedFreeTrial,
      hasActiveCreatorPro: false,
    })
    // </CHANGE>
  } catch (error) {
    console.error("[Trial Status] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
