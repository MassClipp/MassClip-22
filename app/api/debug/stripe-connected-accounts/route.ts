import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

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

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [Debug Connected Accounts] Checking all connected accounts in ${isTestMode ? "TEST" : "LIVE"} mode`)

    // Get all users with connected Stripe accounts
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"

    const usersSnapshot = await db.collection("users").where(connectedField, "==", true).get()

    if (usersSnapshot.empty) {
      return NextResponse.json({
        success: true,
        connected_accounts: [],
        mode: isTestMode ? "test" : "live",
        message: `No ${isTestMode ? "test" : "live"} connected accounts found`,
        total_count: 0,
      })
    }

    const connectedAccounts = []
    const errors = []

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const userId = userDoc.id
      const accountId = userData[accountIdField]

      if (!accountId) {
        errors.push({
          user_id: userId,
          error: `User marked as connected but no ${accountIdField} found`,
        })
        continue
      }

      try {
        // Verify account still exists in Stripe
        const account = await stripe.accounts.retrieve(accountId)

        connectedAccounts.push({
          user_id: userId,
          user_email: userData.email || "Unknown",
          account_id: account.id,
          account_email: account.email,
          account_type: account.type,
          country: account.country,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          livemode: account.livemode,
          created: account.created,
          created_formatted: safeFormatDate(account.created),
          requirements_count:
            (account.requirements?.currently_due?.length || 0) + (account.requirements?.past_due?.length || 0),
          status: account.charges_enabled && account.payouts_enabled ? "active" : "pending",
          connected_at: userData[`${accountIdField}ConnectedAt`] || "Unknown",
        })
      } catch (stripeError: any) {
        console.error(`❌ [Debug Connected Accounts] Failed to verify account ${accountId}:`, stripeError)
        errors.push({
          user_id: userId,
          account_id: accountId,
          error: `Stripe error: ${stripeError.message}`,
          error_code: stripeError.code,
        })
      }
    }

    return NextResponse.json({
      success: true,
      connected_accounts: connectedAccounts,
      errors: errors,
      mode: isTestMode ? "test" : "live",
      total_count: connectedAccounts.length,
      error_count: errors.length,
      message: `Found ${connectedAccounts.length} ${isTestMode ? "test" : "live"} connected accounts`,
    })
  } catch (error: any) {
    console.error("❌ [Debug Connected Accounts] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve connected accounts",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
