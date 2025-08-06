import { type NextRequest, NextResponse } from "next/server"
import { verifyIdTokenFromRequest } from "@/lib/auth-utils"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 [Connection Status] Checking Stripe connection status")

    // Verify authentication
    const decodedToken = await verifyIdTokenFromRequest(request)
    if (!decodedToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const userUID = decodedToken.uid
    console.log("✅ [Connection Status] Authenticated user:", userUID)

    // Check for existing connection
    const connectionDoc = await adminDb.collection("connectedStripeAccounts").doc(userUID).get()
    
    if (!connectionDoc.exists) {
      console.log("ℹ️ [Connection Status] No connection found for user:", userUID)
      return NextResponse.json({
        connected: false,
        message: "No Stripe account connected"
      })
    }

    const connectionData = connectionDoc.data()!
    console.log("✅ [Connection Status] Connection found:", {
      stripeUserId: connectionData.stripe_user_id,
      connected: connectionData.connected,
      chargesEnabled: connectionData.charges_enabled,
      payoutsEnabled: connectionData.payouts_enabled,
      detailsSubmitted: connectionData.details_submitted,
    })

    // Check if account needs action
    const hasRequirements = connectionData.requirements && (
      connectionData.requirements.currently_due.length > 0 ||
      connectionData.requirements.past_due.length > 0
    )

    const isFullyEnabled = connectionData.details_submitted && 
                          connectionData.charges_enabled && 
                          connectionData.payouts_enabled &&
                          !hasRequirements

    return NextResponse.json({
      connected: connectionData.connected || false,
      accountId: connectionData.stripe_user_id,
      chargesEnabled: connectionData.charges_enabled || false,
      payoutsEnabled: connectionData.payouts_enabled || false,
      detailsSubmitted: connectionData.details_submitted || false,
      isFullyEnabled,
      actionsRequired: hasRequirements,
      requirements: connectionData.requirements || {
        currently_due: [],
        past_due: [],
        pending_verification: [],
        eventually_due: [],
      },
      country: connectionData.country,
      email: connectionData.email,
      businessType: connectionData.business_type,
      defaultCurrency: connectionData.default_currency,
      livemode: connectionData.livemode || false,
      lastUpdated: connectionData.lastUpdated,
    })

  } catch (error) {
    console.error("❌ [Connection Status] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check connection status" },
      { status: 500 }
    )
  }
}
