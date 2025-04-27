import { NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: Request) {
  try {
    const { userId, customerEmail } = await request.json()

    if (!userId || !customerEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`Creating checkout session for user: ${userId}, email: ${customerEmail}`)

    // Create a customer in Stripe if they don't exist
    let customer

    // Check if we already have a Stripe customer ID for this user
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (userData?.stripeCustomerId) {
      // Use existing customer
      customer = await stripe.customers.retrieve(userData.stripeCustomerId)
      console.log(`Using existing Stripe customer: ${customer.id}`)
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          firebaseUserId: userId,
        },
      })

      // Store the Stripe customer ID in the user's document
      await db.collection("users").doc(userId).update({
        stripeCustomerId: customer.id,
        stripeCustomerEmail: customerEmail,
        stripeCustomerCreatedAt: new Date(),
      })

      console.log(`Created new Stripe customer: ${customer.id} for user: ${userId}`)
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/cancel?session_id={CHECKOUT_SESSION_ID}`,
    })

    // Store the session information
    await db.collection("stripeCheckoutSessions").doc(session.id).set({
      userId: userId,
      customerId: customer.id,
      customerEmail: customerEmail,
      sessionId: session.id,
      createdAt: new Date(),
      status: "created",
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
