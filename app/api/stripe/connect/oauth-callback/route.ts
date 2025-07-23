import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state") // This contains the user ID
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  // Handle OAuth errors
  if (error) {
    console.error("Stripe OAuth error:", error, errorDescription)
    return NextResponse.redirect(
      new URL(
        `/dashboard/connect-stripe?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`,
        request.url,
      ),
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/connect-stripe?error=missing_parameters", request.url))
  }

  try {
    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    })

    const stripeUserId = response.stripe_user_id
    const accessToken = response.access_token
    const refreshToken = response.refresh_token
    const scope = response.scope

    if (!stripeUserId) {
      throw new Error("No Stripe user ID received")
    }

    // Get the user ID from the state parameter
    const userId = state

    // Update the user's record with Stripe connection details
    await adminDb.collection("users").doc(userId).update({
      stripeUserId,
      stripeAccountId: stripeUserId,
      stripeAccessToken: accessToken,
      stripeRefreshToken: refreshToken,
      stripeScope: scope,
      stripeConnected: true,
      stripeConnectedAt: new Date(),
      updatedAt: new Date(),
    })

    console.log(`✅ Successfully connected Stripe account ${stripeUserId} for user ${userId}`)

    // Redirect to success page
    return NextResponse.redirect(new URL("/dashboard/connect-stripe?success=true", request.url))
  } catch (error) {
    console.error("Error processing Stripe OAuth callback:", error)
    return NextResponse.redirect(
      new URL(
        `/dashboard/connect-stripe?error=oauth_failed&error_description=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`,
        request.url,
      ),
    )
  }
}
