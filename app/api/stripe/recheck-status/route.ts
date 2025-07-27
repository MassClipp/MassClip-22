import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const decodedToken = await requireAuth(request)
    const userId = decodedToken.uid

    console.log("🔄 [Recheck Status] Starting status recheck for user:", userId)

    // Get current user data
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const stripeAccountId = userData?.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({
        connected: false,
        error: "No Stripe account connected",
        needsConnection: true,
      })
    }

    console.log("🔍 [Recheck Status] Fetching fresh status from Stripe for account:", stripeAccountId)

    // Fetch fresh status from Stripe
    let stripeAccount
    try {
      stripeAccount = await stripe.accounts.retrieve(stripeAccountId)
    } catch (stripeError: any) {
      console.error("❌ [Recheck Status] Stripe API error:", stripeError)

      // If account doesn't exist, clear it from user profile
      if (stripeError.code === "resource_missing") {
        await db.collection("users").doc(userId).update({
          stripeAccountId: null,
          stripeConnectionStatus: "disconnected",
          stripeAccountStatus: null,
          lastStripeUpdate: Date.now(),
        })

        return NextResponse.json({
          connected: false,
          error: "Stripe account no longer exists",
          needsConnection: true,
          accountDeleted: true,
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

    // Update user profile with fresh status
    const now = Date.now()
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

    await db.collection("users").doc(userId).update(updateData)

    console.log("✅ [Recheck Status] Status updated successfully:", connectionStatus)

    // Create account link if actions are required
    let actionUrl = null
    const hasRequirements =
      (stripeAccount.requirements?.currently_due?.length || 0) > 0 ||
      (stripeAccount.requirements?.past_due?.length || 0) > 0

    if (hasRequirements) {
      try {
        const accountLink = await stripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: `${new URL(request.url).origin}/dashboard/connect-stripe/callback?refresh=true`,
          return_url: `${new URL(request.url).origin}/dashboard/connect-stripe/callback?completed=true`,
          type: "account_onboarding",
        })
        actionUrl = accountLink.url
      } catch (linkError) {
        console.error("❌ [Recheck Status] Failed to create account link:", linkError)
      }
    }

    return NextResponse.json({
      connected: true,
      accountId: stripeAccountId,
      status: connectionStatus,
      isFullyEnabled: stripeAccount.charges_enabled && stripeAccount.payouts_enabled,
      actionsRequired: hasRequirements,
      actionUrl,
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
    })
  } catch (error) {
    console.error("❌ [Recheck Status] Error:", error)
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
