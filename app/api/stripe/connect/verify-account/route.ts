import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"

interface VerifyAccountBody {
  account_id: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await requireAuth(request)
    console.log(`🔍 [Verify Account] Request from user: ${decodedToken.uid}`)

    const body = (await request.json()) as VerifyAccountBody
    const { account_id } = body

    if (!account_id) {
      return NextResponse.json(
        {
          success: false,
          error: "account_id is required",
        },
        { status: 400 },
      )
    }

    // Try to retrieve the account from Stripe
    try {
      const account = await stripe.accounts.retrieve(account_id)

      console.log(`✅ [Verify Account] Found account: ${account.id}`)

      return NextResponse.json({
        success: true,
        exists: true,
        account_details: {
          id: account.id,
          type: account.type,
          country: account.country,
          email: account.email,
          created: new Date(account.created * 1000).toISOString(),
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          requirements: {
            currently_due: account.requirements?.currently_due || [],
            past_due: account.requirements?.past_due || [],
            pending_verification: account.requirements?.pending_verification || [],
            disabled_reason: account.requirements?.disabled_reason,
          },
          capabilities: account.capabilities,
          metadata: account.metadata,
          business_profile: account.business_profile,
        },
      })
    } catch (stripeError: any) {
      if (stripeError.code === "resource_missing") {
        console.log(`❌ [Verify Account] Account not found: ${account_id}`)
        return NextResponse.json({
          success: true,
          exists: false,
          account_id,
          error: "Account not found in Stripe",
        })
      }
      throw stripeError
    }
  } catch (error: any) {
    console.error("❌ [Verify Account] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code,
      },
      { status: 500 },
    )
  }
}
