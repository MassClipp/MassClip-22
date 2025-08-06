import { type NextRequest, NextResponse } from "next/server"
import { refreshStripeAccountStatus } from "@/lib/stripe-accounts-service"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    console.log(`🔄 Refreshing Stripe account status for user: ${userId}`)

    const updatedAccount = await refreshStripeAccountStatus(userId)

    if (!updatedAccount) {
      return NextResponse.json({
        connected: false,
        message: "No connected Stripe account found",
      })
    }

    return NextResponse.json({
      connected: true,
      account: {
        stripeAccountId: updatedAccount.stripeAccountId,
        charges_enabled: updatedAccount.charges_enabled,
        payouts_enabled: updatedAccount.payouts_enabled,
        details_submitted: updatedAccount.details_submitted,
        email: updatedAccount.email,
        updatedAt: updatedAccount.updatedAt,
      },
    })
  } catch (error) {
    console.error("❌ Error refreshing Stripe account status:", error)
    return NextResponse.json(
      { error: "Failed to refresh account status" },
      { status: 500 }
    )
  }
}
