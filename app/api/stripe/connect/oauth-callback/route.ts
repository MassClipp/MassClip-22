import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json()

    if (!code || !state) {
      return NextResponse.json({ error: "Missing authorization code or state parameter" }, { status: 400 })
    }

    // Verify state exists in Firestore
    const stateDoc = await adminDb.collection("stripe_oauth_states").doc(state).get()

    if (!stateDoc.exists) {
      console.error("❌ [OAuth Callback] Invalid state parameter")
      return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 })
    }

    const stateData = stateDoc.data()
    const userId = stateData?.userId

    if (!userId) {
      console.error("❌ [OAuth Callback] No user ID found in state")
      return NextResponse.json({ error: "Invalid state data" }, { status: 400 })
    }

    // Clean up the state document
    await adminDb.collection("stripe_oauth_states").doc(state).delete()

    // Exchange the authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    })

    const { stripe_user_id: accountId } = response

    if (!accountId) {
      return NextResponse.json({ error: "Failed to get Stripe account ID" }, { status: 400 })
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(accountId)

    // Update user record in Firestore
    await adminDb
      .collection("users")
      .doc(userId)
      .update({
        stripeAccountId: accountId,
        stripeAccountStatus: account.details_submitted ? "active" : "pending",
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeDetailsSubmitted: account.details_submitted,
        stripeConnectedAt: new Date(),
        updatedAt: new Date(),
      })

    console.log(`✅ [OAuth Callback] Successfully connected Stripe account ${accountId} for user ${userId}`)

    return NextResponse.json({
      success: true,
      accountId,
      status: account.details_submitted ? "active" : "pending",
    })
  } catch (error: any) {
    console.error("❌ [OAuth Callback] Error:", error)

    // Handle specific Stripe errors
    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json({ error: "Invalid authorization code" }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: "Failed to process OAuth callback",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

// Keep GET handler for direct Stripe redirects (fallback)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // Get base URL ensuring it has protocol
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"
  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`
  }

  // Redirect to the frontend callback page with parameters
  const callbackUrl = new URL("/dashboard/connect-stripe/callback", baseUrl)

  if (code) callbackUrl.searchParams.set("code", code)
  if (state) callbackUrl.searchParams.set("state", state)
  if (error) callbackUrl.searchParams.set("error", error)

  return NextResponse.redirect(callbackUrl)
}
