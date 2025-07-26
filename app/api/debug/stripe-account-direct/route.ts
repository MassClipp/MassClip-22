import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Stripe Account] Fetching account details for: ${accountId}`)

    const account = await stripe.accounts.retrieve(accountId)

    console.log(`✅ [Stripe Account] Account retrieved successfully`)

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        business_type: account.business_type,
        country: account.country,
        created: account.created,
        requirements: account.requirements,
        capabilities: account.capabilities,
        settings: account.settings,
      },
    })
  } catch (error: any) {
    console.error("❌ [Stripe Account] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to retrieve Stripe account",
        details: error.message,
        stripeError: error.type || "unknown",
      },
      { status: 500 },
    )
  }
}
