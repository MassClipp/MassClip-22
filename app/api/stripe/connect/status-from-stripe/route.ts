import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

interface StatusFromStripeBody {
  idToken: string
}

// Safe date formatting helper
function safeFormatDate(timestamp: number | null | undefined): string {
  if (!timestamp || typeof timestamp !== "number") {
    return new Date().toISOString()
  }

  try {
    // Stripe timestamps are in seconds, convert to milliseconds
    const date = new Date(timestamp * 1000)
    if (isNaN(date.getTime())) {
      console.warn(`Invalid timestamp: ${timestamp}`)
      return new Date().toISOString()
    }
    return date.toISOString()
  } catch (error) {
    console.warn(`Error formatting timestamp ${timestamp}:`, error)
    return new Date().toISOString()
  }
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as StatusFromStripeBody

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token is required",
        },
        { status: 401 },
      )
    }

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log(`✅ [Status From Stripe] Token verified for user: ${decodedToken.uid}`)
    } catch (tokenError) {
      console.error("❌ [Status From Stripe] Token verification failed:", tokenError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired authentication token",
        },
        { status: 401 },
      )
    }

    const userId = decodedToken.uid

    // Get user document from Firestore
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({
        success: true,
        connected_accounts: [],
        mode: isTestMode ? "test" : "live",
        message: "User profile not found",
      })
    }

    const userData = userDoc.data()!
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedAccountId = userData[accountIdField]

    console.log(`🔍 [Status From Stripe] Checking user ${userId} in ${isTestMode ? "TEST" : "LIVE"} mode:`, {
      accountIdField,
      connectedAccountId,
      hasAccount: !!connectedAccountId,
    })

    if (!connectedAccountId) {
      return NextResponse.json({
        success: true,
        connected_accounts: [],
        mode: isTestMode ? "test" : "live",
        message: `No ${isTestMode ? "test" : "live"} Stripe account connected`,
      })
    }

    // Verify the account still exists in Stripe and get fresh data
    try {
      const account = await stripe.accounts.retrieve(connectedAccountId)

      console.log(`✅ [Status From Stripe] Account verified in Stripe:`, {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      })

      // Format account data safely
      const accountData = {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        livemode: account.livemode,
        created: account.created,
        created_formatted: safeFormatDate(account.created),
        business_profile: account.business_profile,
        capabilities: account.capabilities,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          past_due: account.requirements?.past_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          disabled_reason: account.requirements?.disabled_reason,
        },
        settings: account.settings,
        tos_acceptance: account.tos_acceptance
          ? {
              date: account.tos_acceptance.date,
              date_formatted: safeFormatDate(account.tos_acceptance.date),
              ip: account.tos_acceptance.ip,
            }
          : null,
      }

      return NextResponse.json({
        success: true,
        connected_accounts: [accountData],
        mode: isTestMode ? "test" : "live",
        message: `Found ${isTestMode ? "test" : "live"} Stripe account`,
        account_summary: {
          id: account.id,
          status: account.charges_enabled && account.payouts_enabled ? "active" : "pending",
          requirements_count:
            (account.requirements?.currently_due?.length || 0) + (account.requirements?.past_due?.length || 0),
        },
      })
    } catch (stripeError: any) {
      console.error("❌ [Status From Stripe] Failed to verify account in Stripe:", stripeError)

      return NextResponse.json({
        success: true,
        connected_accounts: [],
        mode: isTestMode ? "test" : "live",
        message: "Connected account is no longer accessible in Stripe",
        error: {
          code: stripeError.code,
          message: stripeError.message,
          stored_account_id: connectedAccountId,
        },
      })
    }
  } catch (error: any) {
    console.error("❌ [Status From Stripe] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check Stripe connection status",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
