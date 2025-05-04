import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import { getSiteUrl } from "@/lib/url-utils"

// Initialize Firebase Admin
initializeFirebaseAdmin()
const db = getFirestore()

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: Request) {
  try {
    const { userId, email, returnUrl } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const siteUrl = getSiteUrl()
    console.log(`Creating checkout session for user ${userId} with email ${email}`)
    console.log(`Current site URL: ${siteUrl}`)
    console.log(`Environment: ${process.env.NEXT_PUBLIC_VERCEL_ENV || "unknown"}`)

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${siteUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/subscription/cancel`,
      customer_email: email,
      metadata: {
        firebaseUid: userId,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "unknown",
        siteUrl: siteUrl,
      },
      subscription_data: {
        metadata: {
          firebaseUid: userId,
          environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "unknown",
          siteUrl: siteUrl,
        },
      },
    })

    // Store the session in Firestore
    await db
      .collection("stripeCheckoutSessions")
      .doc(session.id)
      .set({
        userId,
        email,
        status: "created",
        createdAt: new Date(),
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "unknown",
        siteUrl: siteUrl,
      })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
