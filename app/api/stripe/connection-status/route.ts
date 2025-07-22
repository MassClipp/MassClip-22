import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken)
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get user data from Firestore
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      return NextResponse.json({
        connected: false,
        message: "No Stripe account connected",
      })
    }

    const accountId = userData.stripeAccountId

    try {
      // Get account details from Stripe
      const account = await stripe.accounts.retrieve(accountId)

      const status = {
        connected: true,
        accountId: account.id,
        status: account.details_submitted ? "complete" : "pending",
        businessType: account.business_type || "individual",
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirements: account.requirements?.currently_due || [],
      }

      // Update Firestore with latest status
      await adminDb.collection("users").doc(userId).update({
        stripeAccountStatus: status.status,
        stripeAccountType: status.businessType,
        stripeChargesEnabled: status.chargesEnabled,
        stripePayoutsEnabled: status.payoutsEnabled,
        stripeRequirements: status.requirements,
        lastStripeSync: new Date(),
        updatedAt: new Date(),
      })

      return NextResponse.json(status)
    } catch (stripeError: any) {
      console.error("❌ [Stripe] Error retrieving account:", stripeError)

      // If account doesn't exist in Stripe, clean up Firestore
      if (stripeError.code === "resource_missing") {
        await adminDb.collection("users").doc(userId).update({
          stripeAccountId: null,
          stripeAccountStatus: null,
          stripeAccountType: null,
          updatedAt: new Date(),
        })

        return NextResponse.json({
          connected: false,
          message: "Stripe account not found and has been disconnected",
        })
      }

      return NextResponse.json(
        {
          connected: false,
          error: "Failed to retrieve account status",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Stripe] Connection status error:", error)
    return NextResponse.json({ error: "Failed to check connection status" }, { status: 500 })
  }
}
