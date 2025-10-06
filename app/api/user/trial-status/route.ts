import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/firebase-admin"
import { getMembership } from "@/lib/memberships-service"

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

    // Get membership status
    const membership = await getMembership(userId)

    console.log("[v0] Trial Status - Membership data:", {
      exists: !!membership,
      status: membership?.status,
      currentPeriodEnd: membership?.currentPeriodEnd,
      trialEnd: membership?.trialEnd,
    })

    const isOnTrial = membership?.status === "trialing" || membership?.status === "trial_grace_period"

    if (!membership || !isOnTrial) {
      return NextResponse.json({
        isOnTrial: false,
        daysRemaining: 0,
        trialEndDate: null,
      })
    }

    const now = new Date()
    let trialEndDate: Date | null = null

    const dateField = membership.trialEnd || membership.currentPeriodEnd

    if (dateField) {
      // Check if it's a Firestore Timestamp object
      if (typeof dateField === "object" && "toDate" in dateField) {
        trialEndDate = (dateField as any).toDate()
      } else if (dateField instanceof Date) {
        trialEndDate = dateField
      } else if (typeof dateField === "object" && "_seconds" in dateField) {
        // Handle Firestore Timestamp with _seconds property
        trialEndDate = new Date((dateField as any)._seconds * 1000)
      } else if (typeof dateField === "number") {
        trialEndDate = new Date(dateField * 1000)
      }
    }

    const daysRemaining = trialEndDate ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0

    console.log("[v0] Trial Status - Calculated:", {
      trialEndDate,
      daysRemaining,
      isOnTrial: true,
    })

    return NextResponse.json({
      isOnTrial: true,
      daysRemaining: Math.max(0, daysRemaining),
      trialEndDate: trialEndDate,
    })
  } catch (error) {
    console.error("[Trial Status] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
