import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await requireAuth(request)
    console.log(`🔍 [Debug Connected Accounts] Request from user: ${decodedToken.uid}`)

    // Get all connected accounts from Stripe
    const connectedAccounts = await stripe.accounts.list({
      limit: 100,
    })

    console.log(`📊 [Debug Connected Accounts] Found ${connectedAccounts.data.length} connected accounts`)

    // Format account data for response
    const formattedAccounts = connectedAccounts.data.map((account) => ({
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
    }))

    return NextResponse.json({
      success: true,
      total_accounts: connectedAccounts.data.length,
      accounts: formattedAccounts,
    })
  } catch (error: any) {
    console.error("❌ [Debug Connected Accounts] Error:", error)
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
