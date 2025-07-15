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
    const userId = decodedToken.uid
    console.log(`🔍 [Verify Account] Request from user: ${userId}`)

    const body = (await request.json()) as VerifyAccountBody
    const { account_id } = body

    if (!account_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Account ID is required",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 [Verify Account] Checking account: ${account_id}`)

    // Try to retrieve the account from Stripe
    try {
      const account = await stripe.accounts.retrieve(account_id)

      console.log(`✅ [Verify Account] Account found:`, {
        id: account.id,
        type: account.type,
        email: account.email,
        country: account.country,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        metadata: account.metadata,
      })

      // Check if this account belongs to our platform
      const belongsToPlatform =
        account.metadata?.created_by_platform === "massclip" ||
        account.metadata?.firebase_uid === userId ||
        account.email === decodedToken.email

      return NextResponse.json({
        success: true,
        account_exists: true,
        belongs_to_platform: belongsToPlatform,
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
        verification_checks: {
          has_platform_metadata: account.metadata?.created_by_platform === "massclip",
          has_user_metadata: account.metadata?.firebase_uid === userId,
          email_matches: account.email === decodedToken.email,
        },
      })
    } catch (stripeError: any) {
      if (stripeError.code === "resource_missing") {
        console.log(`❌ [Verify Account] Account not found: ${account_id}`)
        return NextResponse.json({
          success: true,
          account_exists: false,
          error: "Account not found in Stripe",
          account_id,
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
