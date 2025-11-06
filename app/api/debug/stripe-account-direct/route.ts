import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Stripe Account Direct] Fetching account: ${accountId}`)

    const account = await stripe.accounts.retrieve(accountId)

    console.log(`✅ [Stripe Account Direct] Account retrieved successfully`)

    return NextResponse.json({
      account: {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
        business_type: account.business_type,
        country: account.country,
        created: account.created,
      },
    })
  } catch (error: any) {
    console.error("❌ [Stripe Account Direct] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to retrieve Stripe account",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
