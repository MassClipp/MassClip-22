import { NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: Request) {
  try {
    const { userId, priceId } = await request.json()

    if (!userId || !priceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`Creating checkout session for user ${userId} with price ${priceId}`)

    // Get the user from Firestore
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const email = userData?.email || ""

    // Create a new customer or use existing one
    let customerId = userData?.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
          createdAt: new Date().toISOString(),
        },
      })
      customerId = customer.id

      // Update user with customer ID
      await db.collection("users").doc(userId).update({
        stripeCustomerId: customerId,
      })

      console.log(`Created new Stripe customer: ${customerId}`)
    } else {
      console.log(`Using existing Stripe customer: ${customerId}`)
    }

    // Determine success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const successUrl = `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}&userId=${userId}`
    const cancelUrl = `${baseUrl}/pricing?canceled=true`

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        createdAt: new Date().toISOString(),
        priceId,
      },
      subscription_data: {
        metadata: {
          userId,
          createdAt: new Date().toISOString(),
          priceId,
        },
      },
    })

    console.log(`Created checkout session: ${session.id}`)

    // Store the session in Firestore
    await db
      .collection("stripeCheckoutSessions")
      .doc(session.id)
      .set({
        userId,
        sessionId: session.id,
        status: "created",
        createdAt: new Date(),
        priceId,
        metadata: {
          userId,
          createdAt: new Date().toISOString(),
        },
      })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 },
    )
  }
}
