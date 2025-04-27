import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

export async function POST(request: Request) {
  console.log("------------ CREATING CHECKOUT SESSION ------------")

  // Initialize Firebase Admin
  initializeFirebaseAdmin()
  const db = getFirestore()

  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY")
      return NextResponse.json({ error: "Server configuration error: Missing STRIPE_SECRET_KEY" }, { status: 500 })
    }

    if (!process.env.STRIPE_PRICE_ID) {
      console.error("Missing STRIPE_PRICE_ID")
      return NextResponse.json({ error: "Server configuration error: Missing STRIPE_PRICE_ID" }, { status: 500 })
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      console.error("Missing NEXT_PUBLIC_SITE_URL")
      return NextResponse.json({ error: "Server configuration error: Missing NEXT_PUBLIC_SITE_URL" }, { status: 500 })
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Parse request body
    const body = await request.json()
    console.log("Request body:", JSON.stringify(body))

    const { userId, priceId } = body

    if (!userId) {
      console.error("Missing userId in request body")
      return NextResponse.json({ error: "Missing required field: userId" }, { status: 400 })
    }

    if (!priceId) {
      console.error("Missing priceId in request body")
      return NextResponse.json({ error: "Missing required field: priceId" }, { status: 400 })
    }

    console.log(`Creating checkout for user ${userId} with price ${priceId}`)

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.error(`User ${userId} not found in Firestore`)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const customerEmail = userData?.email

    if (!customerEmail) {
      console.error(`User ${userId} has no email in Firestore`)
      return NextResponse.json({ error: "User email not found" }, { status: 400 })
    }

    console.log(`User email: ${customerEmail}`)

    // Check if user already has a Stripe customer ID
    let customerId = userData?.stripeCustomerId

    if (customerId) {
      console.log(`User already has Stripe customer ID: ${customerId}`)
    } else {
      // Create a new customer
      const customer = await stripe.customers.create({
        email: customerEmail,
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
    }

    // Create a checkout session
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
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        userId,
        createdAt: new Date().toISOString(),
      },
      subscription_data: {
        metadata: {
          userId,
          createdAt: new Date().toISOString(),
        },
      },
    })

    // Log the session
    console.log("Session created:", session.id)
    console.log("Success URL:", session.success_url)

    // Store session info in Firestore
    await db
      .collection("checkoutSessions")
      .doc(session.id)
      .set({
        userId,
        customerEmail,
        sessionId: session.id,
        createdAt: new Date(),
        status: "created",
        metadata: {
          userId,
          createdAt: new Date().toISOString(),
        },
      })

    console.log("Session stored in Firestore")
    console.log("------------ CHECKOUT SESSION CREATED ------------")

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create checkout session",
      },
      { status: 500 },
    )
  }
}
