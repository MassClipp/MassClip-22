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
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    if (!process.env.STRIPE_PRICE_ID) {
      console.error("Missing STRIPE_PRICE_ID")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      console.error("Missing NEXT_PUBLIC_SITE_URL")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Parse request body
    const body = await request.json()
    console.log("Request body:", JSON.stringify(body))

    const { userId, customerEmail } = body

    if (!userId || !customerEmail) {
      console.error("Missing userId or customerEmail")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`Creating checkout for user ${userId} with email ${customerEmail}`)

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
      customer_email: customerEmail,
      // Include userId directly in the success URL
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}&userId=${userId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/cancel?session_id={CHECKOUT_SESSION_ID}`,
    })

    // Log the session
    console.log("Session created:", session.id)
    console.log("Success URL:", session.success_url)

    // Store session info in Firestore
    await db.collection("checkoutSessions").doc(session.id).set({
      userId,
      customerEmail,
      sessionId: session.id,
      createdAt: new Date(),
      status: "created",
    })

    console.log("Session stored in Firestore")
    console.log("------------ CHECKOUT SESSION CREATED ------------")

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
