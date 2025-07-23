import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Check if user already has a Stripe account
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    let stripeAccountId = userData?.stripeAccountId

    // If no Stripe account exists, create one
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: userData?.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })

      stripeAccountId = account.id

      // Save the Stripe account ID to the user's record
      await adminDb.collection("users").doc(userId).update({
        stripeAccountId,
        updatedAt: new Date(),
      })
    }

    // Create OAuth link with correct redirect URI
    const oauthLink = await stripe.oauth.authorizeUrl({
      response_type: "code",
      client_id: process.env.STRIPE_CLIENT_ID!,
      scope: "read_write",
      redirect_uri: "https://massclip.pro/api/stripe/connect/oauth-callback",
      state: userId, // Pass user ID in state parameter
      stripe_user: {
        email: userData?.email,
        url: userData?.website || "https://massclip.pro",
        country: "US",
        business_type: "individual",
      },
    })

    return NextResponse.json({ url: oauthLink })
  } catch (error) {
    console.error("Error creating Stripe onboarding link:", error)
    return NextResponse.json({ error: "Failed to create onboarding link" }, { status: 500 })
  }
}
