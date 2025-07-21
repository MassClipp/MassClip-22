import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log(`[Onboarding Status] Checking status for user: ${userId}`)

    // Get user's Stripe account ID from database
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.stripeAccountId) {
      console.log(`[Onboarding Status] No Stripe account found`)
      return NextResponse.json({
        connected: false,
        onboardingRequired: true,
        message: "No Stripe account connected",
      })
    }

    const accountId = userData.stripeAccountId

    // Get account details from Stripe
    try {
      const account = await stripe.accounts.retrieve(accountId)

      console.log(`[Onboarding Status] Account details:`, {
        id: account.id,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      })

      const isFullyConnected = account.details_submitted && account.charges_enabled && account.payouts_enabled

      return NextResponse.json({
        connected: isFullyConnected,
        accountId: account.id,
        onboardingRequired: !isFullyConnected,
        account: {
          id: account.id,
          type: account.type,
          country: account.country,
          email: account.email,
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          requirements: account.requirements,
        },
      })
    } catch (stripeError: any) {
      console.error(`[Onboarding Status] Stripe error:`, stripeError)

      if (stripeError.code === "resource_missing") {
        // Account doesn't exist in Stripe, clean up database
        await db.collection("users").doc(userId).update({
          stripeAccountId: null,
          stripeAccountType: null,
          stripeConnectedAt: null,
        })

        return NextResponse.json({
          connected: false,
          onboardingRequired: true,
          message: "Stripe account not found, please reconnect",
        })
      }

      throw stripeError
    }
  } catch (error: any) {
    console.error("[Onboarding Status] Error:", error)

    return NextResponse.json(
      {
        error: error.message || "Failed to check onboarding status",
        details: error.type || "unknown_error",
      },
      { status: 500 },
    )
  }
}
