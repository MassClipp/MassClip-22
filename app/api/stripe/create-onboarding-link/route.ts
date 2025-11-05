import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, db } from "@/lib/firebase-admin"

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
  try {
    // Get the Firebase ID token from the request
    const { idToken, accountId } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    let stripeAccountId = accountId

    // If no accountId provided, get it from user data
    if (!stripeAccountId) {
      const userDoc = await db.collection("users").doc(uid).get()
      const userData = userDoc.data()
      stripeAccountId = userData?.stripeAccountId

      if (!stripeAccountId) {
        return NextResponse.json({ error: "No Stripe account found" }, { status: 404 })
      }
    }

    // Get the base URL for redirect URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro"

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/dashboard/earnings?refresh=stripe`,
      return_url: `${baseUrl}/dashboard/earnings?success=stripe`,
      type: "account_onboarding",
    })

    console.log(`Created onboarding link for account ${stripeAccountId}`)

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      accountId: stripeAccountId,
      expiresAt: accountLink.expires_at,
    })
  } catch (error) {
    console.error("Error creating Stripe onboarding link:", error)
    return NextResponse.json(
      {
        error: "Failed to create onboarding link",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
