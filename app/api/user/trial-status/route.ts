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

    // Get membership status
    const membership = await getMembership(userId)

    if (!membership || membership.status !== "trialing") {
      return NextResponse.json({
        isOnTrial: false,
        daysRemaining: 0,
        trialEndDate: null,
      })
    }

    // Calculate days remaining
    const now = new Date()
    const trialEnd = membership.currentPeriodEnd
    const daysRemaining = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0

    return NextResponse.json({
      isOnTrial: true,
      daysRemaining: Math.max(0, daysRemaining),
      trialEndDate: trialEnd,
    })
  } catch (error) {
    console.error("[Trial Status] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
