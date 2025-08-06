import { NextRequest, NextResponse } from "next/server"
import { getConnectedStripeAccount } from "@/lib/stripe-accounts-service"
import { adminAuth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get user from Authorization header
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`🔍 Checking Stripe connection for user: ${userId}`)

    // Check if user has a connected Stripe account
    const connectedAccount = await getConnectedStripeAccount(userId)

    if (!connectedAccount) {
      return NextResponse.json({
        connected: false,
        message: "No Stripe account connected"
      })
    }

    return NextResponse.json({
      connected: true,
      account: {
        stripeAccountId: connectedAccount.stripeAccountId,
        email: connectedAccount.email,
        charges_enabled: connectedAccount.charges_enabled,
        payouts_enabled: connectedAccount.payouts_enabled,
        details_submitted: connectedAccount.details_submitted,
        createdAt: connectedAccount.createdAt,
        updatedAt: connectedAccount.updatedAt,
      }
    })

  } catch (error) {
    console.error("❌ Error checking Stripe connection:", error)
    return NextResponse.json(
      { error: "Failed to check Stripe connection" },
      { status: 500 }
    )
  }
}
