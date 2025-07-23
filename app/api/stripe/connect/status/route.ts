import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`🔄 [Status Check] Checking Stripe connection for user: ${userId}`)

    // Get user data from database
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const accountIdField = isTestMode ? "stripeTestAccountId" : "stripeAccountId"
    const connectedField = isTestMode ? "stripeTestConnected" : "stripeConnected"
    const detailsField = isTestMode ? "stripeTestAccountDetails" : "stripeAccountDetails"

    const accountId = userData?.[accountIdField]
    const isConnected = userData?.[connectedField] || false
    const storedDetails = userData?.[detailsField]

    if (!accountId || !isConnected) {
      console.log(`📋 [Status Check] User ${userId} has no Stripe account connected`)
      return NextResponse.json({
        connected: false,
        mode: isTestMode ? "test" : "live",
      })
    }

    // Fetch fresh account data from Stripe
    let account
    try {
      account = await stripe.accounts.retrieve(accountId)
      console.log(`✅ [Status Check] Retrieved fresh account data for ${accountId}`)
    } catch (stripeError: any) {
      console.error(`❌ [Status Check] Failed to retrieve account ${accountId}:`, stripeError)

      // Account might have been deleted or deauthorized
      if (stripeError.code === "account_invalid") {
        // Clear the invalid account from database
        await db
          .collection("users")
          .doc(userId)
          .update({
            [accountIdField]: null,
            [connectedField]: false,
            [detailsField]: null,
            updatedAt: new Date().toISOString(),
          })

        return NextResponse.json({
          connected: false,
          error: "Account no longer valid",
          mode: isTestMode ? "test" : "live",
        })
      }

      return NextResponse.json({
        connected: true,
        error: "Unable to verify account status",
        accountId,
        mode: isTestMode ? "test" : "live",
      })
    }

    // Update stored account details if they've changed
    const freshDetails = {
      id: accountId,
      country: account.country,
      email: account.email,
      type: account.type,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirementsCurrentlyDue: account.requirements?.currently_due || [],
      requirementsEventuallyDue: account.requirements?.eventually_due || [],
      connectedAt: storedDetails?.connectedAt || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    // Update database with fresh details
    await db
      .collection("users")
      .doc(userId)
      .update({
        [detailsField]: freshDetails,
        updatedAt: new Date().toISOString(),
      })

    const fullyEnabled = account.charges_enabled && account.payouts_enabled
    const needsAttention = (account.requirements?.currently_due?.length || 0) > 0

    console.log(
      `📋 [Status Check] User ${userId} account status: enabled=${fullyEnabled}, needs_attention=${needsAttention}`,
    )

    return NextResponse.json({
      connected: true,
      accountId,
      fullyEnabled,
      needsAttention,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirementsCurrentlyDue: account.requirements?.currently_due || [],
      requirementsEventuallyDue: account.requirements?.eventually_due || [],
      country: account.country,
      email: account.email,
      mode: isTestMode ? "test" : "live",
    })
  } catch (error: any) {
    console.error("❌ [Status Check] Error checking connection status:", error)
    return NextResponse.json({ error: "Failed to check connection status", details: error.message }, { status: 500 })
  }
}
