import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-server"
import { stripe } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const decodedToken = await requireAuth(request)
    const userId = decodedToken.uid

    console.log("🔍 [Login Status Check] Checking Stripe status for user:", userId)

    // Get current user data
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({
        connected: false,
        error: "User not found",
        needsConnection: true,
      })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId
    const lastUpdate = userData?.lastStripeUpdate
    const cachedStatus = userData?.stripeAccountStatus

    if (!stripeAccountId) {
      console.log("❌ [Login Status Check] No Stripe account ID found")
      return NextResponse.json({
        connected: false,
        needsConnection: true,
        message: "No Stripe account connected",
      })
    }

    // Check if we have recent cached status (less than 5 minutes old)
    const now = Date.now()
    const cacheAge = lastUpdate ? now - lastUpdate : Number.POSITIVE_INFINITY
    const cacheValid = cacheAge < 5 * 60 * 1000 // 5 minutes

    if (cacheValid && cachedStatus) {
      console.log("✅ [Login Status Check] Using cached status (age:", Math.round(cacheAge / 1000), "seconds)")

      const connectionStatus = cachedStatus.charges_enabled && cachedStatus.payouts_enabled ? "verified" : "pending"
      const hasRequirements =
        (cachedStatus.requirements?.currently_due?.length || 0) > 0 ||
        (cachedStatus.requirements?.past_due?.length || 0) > 0

      return NextResponse.json({
        connected: true,
        accountId: stripeAccountId,
        status: connectionStatus,
        isFullyEnabled: cachedStatus.charges_enabled && cachedStatus.payouts_enabled,
        actionsRequired: hasRequirements,
        charges_enabled: cachedStatus.charges_enabled,
        payouts_enabled: cachedStatus.payouts_enabled,
        details_submitted: cachedStatus.details_submitted,
        requirements: cachedStatus.requirements,
        disabled_reason: cachedStatus.disabled_reason,
        country: cachedStatus.country,
        business_type: cachedStatus.business_type,
        lastChecked: lastUpdate,
        fromCache: true,
      })
    }

    // Cache is stale or missing, fetch fresh status
    console.log("🔄 [Login Status Check] Cache stale, fetching fresh status from Stripe")

    let stripeAccount
    try {
      stripeAccount = await stripe.accounts.retrieve(stripeAccountId)
    } catch (stripeError: any) {
      console.error("❌ [Login Status Check] Stripe API error:", stripeError)

      // If account doesn't exist, clear it from user profile
      if (stripeError.code === "resource_missing") {
        await db.collection("users").doc(userId).update({
          stripeAccountId: null,
          stripeConnectionStatus: "disconnected",
          stripeAccountStatus: null,
          lastStripeUpdate: now,
        })

        return NextResponse.json({
          connected: false,
          needsConnection: true,
          error: "Stripe account no longer exists",
          accountDeleted: true,
        })
      }

      // For other errors, return cached status if available
      if (cachedStatus) {
        console.log("⚠️ [Login Status Check] Stripe error, falling back to cached status")
        const connectionStatus = cachedStatus.charges_enabled && cachedStatus.payouts_enabled ? "verified" : "pending"

        return NextResponse.json({
          connected: true,
          accountId: stripeAccountId,
          status: connectionStatus,
          isFullyEnabled: cachedStatus.charges_enabled && cachedStatus.payouts_enabled,
          charges_enabled: cachedStatus.charges_enabled,
          payouts_enabled: cachedStatus.payouts_enabled,
          details_submitted: cachedStatus.details_submitted,
          lastChecked: lastUpdate,
          fromCache: true,
          warning: "Could not fetch fresh status from Stripe",
        })
      }

      return NextResponse.json(
        {
          connected: false,
          error: "Failed to check Stripe account status",
          stripeError: stripeError.message,
        },
        { status: 500 },
      )
    }

    // Update cache with fresh status
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

    // Update cache in background (don't wait for it)
    db.collection("users")
      .doc(userId)
      .update(updateData)
      .catch((error) => {
        console.error("❌ [Login Status Check] Failed to update cache:", error)
      })

    console.log("✅ [Login Status Check] Fresh status retrieved and cached")

    const hasRequirements =
      (stripeAccount.requirements?.currently_due?.length || 0) > 0 ||
      (stripeAccount.requirements?.past_due?.length || 0) > 0

    return NextResponse.json({
      connected: true,
      accountId: stripeAccountId,
      status: connectionStatus,
      isFullyEnabled: stripeAccount.charges_enabled && stripeAccount.payouts_enabled,
      actionsRequired: hasRequirements,
      charges_enabled: stripeAccount.charges_enabled,
      payouts_enabled: stripeAccount.payouts_enabled,
      details_submitted: stripeAccount.details_submitted,
      requirements: {
        currently_due:
          stripeAccount.requirements?.currently_due?.map((field) => ({
            field,
            description: `Complete ${field.replace(/_/g, " ")}`,
          })) || [],
        past_due:
          stripeAccount.requirements?.past_due?.map((field) => ({
            field,
            description: `Complete ${field.replace(/_/g, " ")} (Past Due)`,
          })) || [],
        eventually_due:
          stripeAccount.requirements?.eventually_due?.map((field) => ({
            field,
            description: `Complete ${field.replace(/_/g, " ")} (Eventually Due)`,
          })) || [],
        pending_verification:
          stripeAccount.requirements?.pending_verification?.map((field) => ({
            field,
            description: `Verification pending for ${field.replace(/_/g, " ")}`,
          })) || [],
      },
      disabled_reason: stripeAccount.requirements?.disabled_reason,
      country: stripeAccount.country,
      business_type: stripeAccount.business_type,
      lastChecked: now,
      fromCache: false,
    })
  } catch (error) {
    console.error("❌ [Login Status Check] Error:", error)
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
