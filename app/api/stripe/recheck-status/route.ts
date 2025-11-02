import { type NextRequest, NextResponse } from "next/server"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  console.log("🔄 [Recheck Status] Starting Stripe status recheck")

  try {
    // Get authenticated user
    const headers = Object.fromEntries(request.headers.entries())
    const user = await getAuthenticatedUser(headers)
    console.log(`✅ [Recheck Status] Authenticated user: ${user.uid}`)

    // Get current user data
    const userDoc = await adminDb.collection("users").doc(user.uid).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      console.log("❌ [Recheck Status] No Stripe account ID found")
      return NextResponse.json(
        {
          error: "No Stripe account connected",
          code: "NO_STRIPE_ACCOUNT",
        },
        { status: 400 },
      )
    }

    const stripeAccountId = userData.stripeAccountId
    console.log(`🔍 [Recheck Status] Fetching fresh status for account: ${stripeAccountId}`)

    // Fetch fresh account status from Stripe
    let stripeAccount
    try {
      stripeAccount = await stripe.accounts.retrieve(stripeAccountId)
      console.log("✅ [Recheck Status] Fresh Stripe account data retrieved:", {
        id: stripeAccount.id,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        requirements_currently_due: stripeAccount.requirements?.currently_due?.length || 0,
        requirements_past_due: stripeAccount.requirements?.past_due?.length || 0,
      })
    } catch (stripeError: any) {
      console.error("❌ [Recheck Status] Failed to retrieve Stripe account:", stripeError)

      // Handle deleted/invalid accounts
      if (stripeError.code === "account_invalid" || stripeError.code === "resource_missing") {
        console.log("🗑️ [Recheck Status] Stripe account no longer exists, clearing user data")

        await adminDb.collection("users").doc(user.uid).update({
          stripeAccountId: null,
          stripeConnectionStatus: "disconnected",
          stripeAccountStatus: null,
          lastStripeUpdate: new Date(),
        })

        return NextResponse.json({
          success: false,
          status: "disconnected",
          message: "Stripe account no longer exists",
          action_required: "reconnect",
        })
      }

      return NextResponse.json(
        {
          error: "Failed to fetch Stripe account status",
          code: "STRIPE_API_ERROR",
          details: stripeError.message,
        },
        { status: 500 },
      )
    }

    // Update status in Firestore
    const now = new Date()
    const connectionStatus = stripeAccount.charges_enabled && stripeAccount.payouts_enabled ? "verified" : "pending"

    const updateData = {
      stripeConnectionStatus: connectionStatus,
      lastStripeUpdate: now,
      stripeAccountStatus: {
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        country: stripeAccount.country,
        business_type: stripeAccount.business_type,
        disabled_reason: stripeAccount.requirements?.disabled_reason || null,
        requirements: {
          currently_due: stripeAccount.requirements?.currently_due || [],
          past_due: stripeAccount.requirements?.past_due || [],
          eventually_due: stripeAccount.requirements?.eventually_due || [],
          pending_verification: stripeAccount.requirements?.pending_verification || [],
        },
        last_verified: now,
      },
    }

    console.log("🔄 [Recheck Status] Updating user profile with fresh data...")
    await adminDb.collection("users").doc(user.uid).update(updateData)

    console.log("✅ [Recheck Status] Status rechecked successfully:", connectionStatus)

    return NextResponse.json({
      success: true,
      status: connectionStatus,
      account_id: stripeAccountId,
      account_status: updateData.stripeAccountStatus,
      last_updated: now.toISOString(),
      message: "Stripe status updated successfully",
    })
  } catch (error: any) {
    console.error("❌ [Recheck Status] Error:", error)

    return NextResponse.json(
      {
        error: "Failed to recheck Stripe status",
        code: "RECHECK_FAILED",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
