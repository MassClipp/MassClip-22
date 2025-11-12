import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { verifyIdToken } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const FACELESS_PRO_PROMO_CODE = "promo_1SShryDheyb0pkWF4iiAvi7o"

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json()

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 })
    }

    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 })
    }

    // Get or create Stripe customer
    const userDoc = await getDoc(doc(db, "users", userId))
    const userData = userDoc.data()
    let stripeCustomerId = userData?.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { firebaseUID: userId },
      })
      stripeCustomerId = customer.id

      await setDoc(doc(db, "users", userId), { stripeCustomerId }, { merge: true })
    }

    // Create checkout session with 14-day free trial for Faceless Pro
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_collection: "if_required", // Don't require payment method for trial
      line_items: [
        {
          price: process.env.FACELESS_PRO_FIRST!, // Faceless Pro price ID
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14, // 14-day free trial for Faceless Pro
        metadata: {
          firebaseUID: userId,
          plan: "faceless_pro",
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/welcome`,
      metadata: {
        firebaseUID: userId,
        plan: "faceless_pro",
        isTrial: "true",
        buyerUid: userId,
      },
      discounts: [
        {
          promotion_code: FACELESS_PRO_PROMO_CODE,
        },
      ],
    })

    // Mark onboarding as complete
    await setDoc(
      doc(db, "users", userId),
      {
        onboardingComplete: true,
        onboardingCompletedAt: new Date(),
      },
      { merge: true },
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[Trial Checkout] Error:", error)
    return NextResponse.json({ error: "Failed to create trial checkout session" }, { status: 500 })
  }
}
