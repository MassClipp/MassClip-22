import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

async function getParams(request: NextRequest): Promise<{ code: string | null; state: string | null }> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  return { code, state }
}

export async function GET(request: NextRequest) {
  try {
    const { code, state } = await getParams(request)

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 })
    }

    console.log(`🔄 [OAuth Callback] Handling OAuth callback with code: ${code} and state: ${state}`)

    // Validate state (CSRF protection) - replace with your actual state validation
    // For example, check if the state matches a value stored in a cookie or session

    // Retrieve the access token from Stripe
    const tokenResponse = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    })

    const stripeAccountId = tokenResponse.stripe_user_id

    // Get user ID from state (replace with your actual method)
    const userId = state // Assuming state is the user ID

    // Update user document with Stripe account ID
    await db.collection("users").doc(userId).update({
      stripeAccountId,
    })

    console.log(`✅ [OAuth Callback] Successfully linked Stripe account ${stripeAccountId} to user ${userId}`)

    // Redirect the user to a success page or dashboard
    return NextResponse.redirect(new URL("/dashboard/connect-stripe", request.url))
  } catch (e: any) {
    console.error("❌ [OAuth Callback] Unexpected error:", e)
    return NextResponse.json({ error: "Failed to onboard account" }, { status: 500 })
  }
}
