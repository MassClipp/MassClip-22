import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: "Missing accountId parameter" }, { status: 400 })
    }

    console.log(`🔍 [Direct Stripe Lookup] Fetching account: ${accountId}`)

    const account = await stripe.accounts.retrieve(accountId)

    console.log(`✅ [Direct Stripe Lookup] Account retrieved successfully:`, {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      business_type: account.business_type,
      country: account.country,
      requirements: {
        currently_due: account.requirements?.currently_due?.length || 0,
        past_due: account.requirements?.past_due?.length || 0,
        eventually_due: account.requirements?.eventually_due?.length || 0,
      },
    })

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
        business_profile: account.business_profile,
      },
    })
  } catch (error: any) {
    console.error("❌ [Direct Stripe Lookup] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to retrieve Stripe account",
        details: error.message,
        code: error.code,
        type: error.type,
      },
      { status: 500 },
    )
  }
}
