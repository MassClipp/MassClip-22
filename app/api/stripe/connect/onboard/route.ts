import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase/firebaseAdmin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Get user data
    const userDoc = await db.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    let stripeAccountId = userData.stripeAccountId

    // Create Stripe Connect account if it doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US", // You might want to make this configurable
        email: userData.email,
        metadata: {
          firebaseUid: uid,
          username: userData.username || "",
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual", // or "company" based on your needs
      })

      stripeAccountId = account.id

      // Update user document with Stripe account ID
      await db.collection("users").doc(uid).update({
        stripeAccountId: stripeAccountId,
        stripeAccountCreated: new Date(),
      })
    }

    // Check if account is already fully onboarded
    const account = await stripe.accounts.retrieve(stripeAccountId)

    if (account.details_submitted && account.charges_enabled) {
      // Update user status
      await db
        .collection("users")
        .doc(uid)
        .update({
          stripeOnboardingComplete: true,
          stripeOnboarded: true,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          stripeCanReceivePayments: account.charges_enabled && account.payouts_enabled,
          stripeStatusLastChecked: new Date(),
        })

      return NextResponse.json({
        onboardingComplete: true,
        accountId: stripeAccountId,
        message: "Account is already fully set up",
      })
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/stripe/success`,
      type: "account_onboarding",
    })

    return NextResponse.json({
      onboardingComplete: false,
      onboardingUrl: accountLink.url,
      accountId: stripeAccountId,
    })
  } catch (error) {
    console.error("Error creating Stripe Connect onboarding:", error)

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: "Stripe error",
          details: error.message,
          code: error.code,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({ error: "Failed to create onboarding session" }, { status: 500 })
  }
}
