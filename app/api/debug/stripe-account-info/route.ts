import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId } = body

    if (!accountId || !accountId.startsWith("acct_")) {
      return NextResponse.json({ error: "Invalid account ID" }, { status: 400 })
    }

    console.log("🔍 [Account Info] Retrieving account:", accountId)

    try {
      const account = await stripe.accounts.retrieve(accountId)

      console.log("✅ [Account Info] Account retrieved successfully")
      console.log("📊 [Account Info] Account details:", {
        id: account.id,
        type: account.type,
        country: account.country,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
      })

      return NextResponse.json({
        success: true,
        account: {
          id: account.id,
          type: account.type,
          country: account.country,
          email: account.email,
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          created: account.created,
          business_type: account.business_type,
          requirements: account.requirements,
          capabilities: account.capabilities,
        },
      })
    } catch (stripeError: any) {
      console.error("❌ [Account Info] Stripe error:", stripeError.message)
      console.error("❌ [Account Info] Error code:", stripeError.code)
      console.error("❌ [Account Info] Error type:", stripeError.type)

      return NextResponse.json(
        {
          error: "Failed to retrieve account",
          details: {
            message: stripeError.message,
            code: stripeError.code,
            type: stripeError.type,
          },
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Account Info] Unexpected error:", error.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
