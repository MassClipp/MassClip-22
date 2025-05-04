import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

export async function POST(request: Request) {
  console.log("------------ 🔐 CHECKOUT SESSION API START ------------")

  // Check for required environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("🔐 CHECKOUT ERROR: Missing STRIPE_SECRET_KEY")
    return NextResponse.json({ error: "Server configuration error: Missing Stripe secret key" }, { status: 500 })
  }

  if (!process.env.STRIPE_PRICE_ID) {
    console.error("🔐 CHECKOUT ERROR: Missing STRIPE_PRICE_ID")
    return NextResponse.json({ error: "Server configuration error: Missing Stripe price ID" }, { status: 500 })
  }

  // Initialize Firebase Admin
  initializeFirebaseAdmin()
  const db = getFirestore()

  try {
    // Initialize Stripe with the secret key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Parse the request body
    const body = await request.json()
    console.log("🔐 CHECKOUT: Request body:", JSON.stringify(body, null, 2))

    // Extract and validate required fields
    const { userId, email } = body

    // Validate required fields
    if (!userId) {
      console.error("🔐 CHECKOUT ERROR: Missing userId in request")
      return NextResponse.json({ error: "Missing required field: userId" }, { status: 400 })
    }

    if (!email) {
      console.error("🔐 CHECKOUT ERROR: Missing email in request")
      return NextResponse.json({ error: "Missing required field: email" }, { status: 400 })
    }

    // IMPORTANT: Always use https://massclip.pro for production
    const siteUrl = "https://massclip.pro"
    console.log(`🔐 CHECKOUT: Using hardcoded site URL: ${siteUrl}`)

    // Create metadata object with all required fields
    const metadata = {
      firebaseUid: userId,
      email: email,
      timestamp: new Date().toISOString(),
      siteUrl: siteUrl,
    }

    console.log("🔐 CHECKOUT: Prepared metadata:", JSON.stringify(metadata, null, 2))

    // Generate unique success and cancel URLs with timestamp to prevent caching
    const uniqueParam = `t=${Date.now()}`
    const successUrl = `${siteUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}&${uniqueParam}`
    const cancelUrl = `${siteUrl}/subscription/cancel?${uniqueParam}`

    console.log(`🔐 CHECKOUT: Success URL: ${successUrl}`)
    console.log(`🔐 CHECKOUT: Cancel URL: ${cancelUrl}`)

    // Create a new checkout session with metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      metadata: metadata,
      subscription_data: {
        metadata: metadata,
      },
    })

    console.log(`🔐 CHECKOUT: Created new session with ID: ${session.id}`)

    // Store session info in Firestore for tracking and debugging
    await db.collection("stripeCheckoutSessions").doc(session.id).set({
      userId,
      email,
      sessionId: session.id,
      createdAt: new Date(),
      status: "created",
      metadata: metadata,
      siteUrl: siteUrl,
    })

    console.log("🔐 CHECKOUT: Session stored in Firestore")
    console.log("------------ 🔐 CHECKOUT SESSION API END ------------")

    // Return both the URL and session ID for tracking
    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error("🔐 CHECKOUT ERROR:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create checkout session",
      },
      { status: 500 },
    )
  }
}
