import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { stripe, isTestMode } from "@/lib/stripe"

interface StatusFromStripeBody {
  idToken: string
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

    try {
      // Get user data from Firestore
      const userDoc = await db.collection("users").doc(userId).get()
      const userData = userDoc.exists ? userDoc.data() : {}

      console.log(`🔍 [Status From Stripe] Checking connection status for user ${userId}`)

      // Check for test mode connection
      let stripeAccountId = null
      let connectionStatus = "not_connected"
      let accountDetails = null

      if (isTestMode && userData?.stripeTestAccountId) {
        stripeAccountId = userData.stripeTestAccountId
        console.log(`🧪 [Status From Stripe] Found test account: ${stripeAccountId}`)
      } else if (!isTestMode && userData?.stripeAccountId) {
        stripeAccountId = userData.stripeAccountId
        console.log(`🔴 [Status From Stripe] Found live account: ${stripeAccountId}`)
      }

      if (stripeAccountId) {
        try {
          // Verify the account still exists in Stripe
          const account = await stripe.accounts.retrieve(stripeAccountId)

          accountDetails = {
            id: account.id,
            type: account.type,
            email: account.email,
            country: account.country,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            livemode: account.livemode,
            requirements: {
              currently_due: account.requirements?.currently_due || [],
              past_due: account.requirements?.past_due || [],
              eventually_due: account.requirements?.eventually_due || [],
            },
            capabilities: account.capabilities,
            metadata: account.metadata,
          }

          // Determine connection status based on account state
          if (account.charges_enabled && account.payouts_enabled) {
            connectionStatus = "fully_connected"
          } else if (account.details_submitted) {
            connectionStatus = "pending_verification"
          } else {
            connectionStatus = "onboarding_required"
          }

          console.log(`✅ [Status From Stripe] Account verified: ${account.id} - Status: ${connectionStatus}`)
        } catch (stripeError: any) {
          console.error(`❌ [Status From Stripe] Failed to retrieve account ${stripeAccountId}:`, stripeError)

          if (stripeError.code === "resource_missing") {
            // Account was deleted from Stripe, clean up Firestore
            const updateData = isTestMode
              ? { stripeTestAccountId: null, stripeTestConnected: false }
              : { stripeAccountId: null, stripeConnected: false }

            await db.collection("users").doc(userId).update(updateData)
            connectionStatus = "account_deleted"
          } else {
            connectionStatus = "error"
          }
        }
      }

      return NextResponse.json({
        success: true,
        user_id: userId,
        is_connected: connectionStatus === "fully_connected",
        connection_status: connectionStatus,
        account_id: stripeAccountId,
        account_details: accountDetails,
        environment: {
          is_test_mode: isTestMode,
          mode: isTestMode ? "test" : "live",
        },
        firestore_data: {
          has_test_account: !!userData?.stripeTestAccountId,
          has_live_account: !!userData?.stripeAccountId,
          test_account_id: userData?.stripeTestAccountId || null,
          live_account_id: userData?.stripeAccountId || null,
        },
        message: getStatusMessage(connectionStatus, isTestMode),
      })
    } catch (error: any) {
      console.error("❌ [Status From Stripe] Database error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to check connection status",
          details: error.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Status From Stripe] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

function getStatusMessage(status: string, isTestMode: boolean): string {
  const mode = isTestMode ? "test" : "live"

  switch (status) {
    case "fully_connected":
      return `Stripe account is fully connected and active in ${mode} mode`
    case "pending_verification":
      return `Stripe account is connected but pending verification in ${mode} mode`
    case "onboarding_required":
      return `Stripe account exists but requires onboarding completion in ${mode} mode`
    case "account_deleted":
      return `Previously connected account was deleted from Stripe in ${mode} mode`
    case "error":
      return `Error accessing Stripe account in ${mode} mode`
    case "not_connected":
    default:
      return `No Stripe account connected in ${mode} mode`
  }
}
