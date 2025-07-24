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
      .doc(state)
      .update({
        stripeAccountId: accountId,
        stripeAccountStatus: account.details_submitted ? "active" : "pending",
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeDetailsSubmitted: account.details_submitted,
        stripeConnectedAt: new Date(),
        updatedAt: new Date(),
      })

    return NextResponse.json({
      success: true,
      accountId,
      status: account.details_submitted ? "active" : "pending",
    })
  } catch (error: any) {
    console.error("OAuth callback error:", error)

    // Handle specific Stripe errors
    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json({ error: "Invalid authorization code" }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to process OAuth callback" }, { status: 500 })
  }
}

// Keep GET handler for direct Stripe redirects (fallback)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // Redirect to the frontend callback page with parameters
  const callbackUrl = new URL("/dashboard/connect-stripe/callback", request.url)

  if (code) callbackUrl.searchParams.set("code", code)
  if (state) callbackUrl.searchParams.set("state", state)
  if (error) callbackUrl.searchParams.set("error", error)

  return NextResponse.redirect(callbackUrl)
}
