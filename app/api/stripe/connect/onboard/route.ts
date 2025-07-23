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

    let accountId = userData?.stripeAccountId

    // Create Stripe account if it doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })

      accountId = account.id

      // Save the account ID to Firestore
      await adminDb.collection("users").doc(userId).update({
        stripeAccountId: accountId,
        stripeAccountStatus: "pending",
        updatedAt: new Date(),
      })
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/connect-stripe?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/oauth-callback?state=${userId}`,
      type: "account_onboarding",
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error("Error creating Stripe onboarding link:", error)
    return NextResponse.json({ error: "Failed to create onboarding link" }, { status: 500 })
  }
}
