import { type NextRequest, NextResponse } from "next/server"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  console.log("🔄 [Login Status Check] Checking Stripe connection status on login")

  try {
    // Get authenticated user
    const headers = Object.fromEntries(request.headers.entries())
    const user = await getAuthenticatedUser(headers)
    console.log(`✅ [Login Status Check] Authenticated user: ${user.uid}`)

    // Get current user data
    const userDoc = await adminDb.collection("users").doc(user.uid).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      console.log("ℹ️ [Login Status Check] No Stripe account connected")
      return NextResponse.json({
        connected: false,
        status: "not_connected",
        message: "No Stripe account connected",
      })
    }

    const stripeAccountId = userData.stripeAccountId
    const lastUpdate = userData.lastStripeUpdate?.toDate()
    const cacheAge = lastUpdate ? Date.now() - lastUpdate.getTime() : Number.POSITIVE_INFINITY
    const cacheMaxAge = 5 * 60 * 1000 // 5 minutes

    console.log(`🔍 [Login Status Check] Found Stripe account: ${stripeAccountId}`)
    console.log(`⏰ [Login Status Check] Cache age: ${Math.round(cacheAge / 1000)}s (max: ${cacheMaxAge / 1000}s)`)

    // If cache is fresh, return cached data
    if (cacheAge < cacheMaxAge && userData.stripeAccountStatus) {
      console.log("✅ [Login Status Check] Using cached status")
      return NextResponse.json({
        connected: true,
        status: userData.stripeConnectionStatus || "unknown",
        account_id: stripeAccountId,
        account_status: userData.stripeAccountStatus,
        last_updated: lastUpdate?.toISOString(),
        cached: true,
      })
    }

    // Cache is stale, fetch fresh data from Stripe
    console.log("🔄 [Login Status Check] Cache stale, fetching fresh data from Stripe...")

    let stripeAccount
    try {
      stripeAccount = await stripe.accounts.retrieve(stripeAccountId)
      console.log("✅ [Login Status Check] Fresh Stripe data retrieved")
    } catch (stripeError: any) {
      console.error("❌ [Login Status Check] Failed to retrieve Stripe account:", stripeError)

      // Handle deleted/invalid accounts
      if (stripeError.code === "account_invalid" || stripeError.code === "resource_missing") {
        console.log("🗑️ [Login Status Check] Stripe account no longer exists, clearing user data")

        await adminDb.collection("users").doc(user.uid).update({
          stripeAccountId: null,
          stripeConnectionStatus: "disconnected",
          stripeAccountStatus: null,
          lastStripeUpdate: new Date(),
        })

        return NextResponse.json({
          connected: false,
          status: "disconnected",
          message: "Stripe account no longer exists",
          action_required: "reconnect",
        })
      }

      // For other errors, return cached data if available
      if (userData.stripeAccountStatus) {
        console.log("⚠️ [Login Status Check] Stripe API error, returning cached data")
        return NextResponse.json({
          connected: true,
          status: userData.stripeConnectionStatus || "unknown",
          account_id: stripeAccountId,
          account_status: userData.stripeAccountStatus,
          last_updated: lastUpdate?.toISOString(),
          cached: true,
          warning: "Could not verify current status with Stripe",
        })
      }

      return NextResponse.json(
        {
          error: "Failed to verify Stripe connection",
          code: "STRIPE_API_ERROR",
          details: stripeError.message,
        },
        { status: 500 },
      )
    }

    // Update cache with fresh data
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

    // Update cache in background (don't await to avoid slowing down login)
    adminDb
      .collection("users")
      .doc(user.uid)
      .update(updateData)
      .catch((error) => {
        console.error("❌ [Login Status Check] Failed to update cache:", error)
      })

    console.log("✅ [Login Status Check] Fresh status retrieved and cached:", connectionStatus)

    return NextResponse.json({
      connected: true,
      status: connectionStatus,
      account_id: stripeAccountId,
      account_status: updateData.stripeAccountStatus,
      last_updated: now.toISOString(),
      cached: false,
    })
  } catch (error: any) {
    console.error("❌ [Login Status Check] Error:", error)

    return NextResponse.json(
      {
        error: "Failed to check Stripe connection status",
        code: "STATUS_CHECK_FAILED",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
