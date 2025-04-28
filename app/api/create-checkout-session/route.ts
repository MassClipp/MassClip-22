import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

export async function POST(request: Request) {
  console.log("------------ 🔐 CHECKOUT SESSION API START ------------")

  // Initialize Firebase Admin
  initializeFirebaseAdmin()
  const db = getFirestore()

  // Check for required environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("🔐 CHECKOUT ERROR: Missing STRIPE_SECRET_KEY")
    return NextResponse.json({ error: "Server configuration error: Missing Stripe secret key" }, { status: 500 })
  }

  if (!process.env.STRIPE_PRICE_ID) {
    console.error("🔐 CHECKOUT ERROR: Missing STRIPE_PRICE_ID")
    return NextResponse.json({ error: "Server configuration error: Missing Stripe price ID" }, { status: 500 })
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    console.error("🔐 CHECKOUT ERROR: Missing NEXT_PUBLIC_SITE_URL")
    return NextResponse.json({ error: "Server configuration error: Missing site URL" }, { status: 500 })
  }

  try {
    // Initialize Stripe with the secret key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Parse the request body
    const body = await request.json()

    // Extract and validate required fields
    const { userId, userEmail, timestamp, clientId } = body

    console.log("🔐 CHECKOUT: Received request with data:")
    console.log(`🔐 CHECKOUT: User ID: ${userId || "MISSING"}`)
    console.log(`🔐 CHECKOUT: User Email: ${userEmail || "MISSING"}`)
    console.log(`🔐 CHECKOUT: Timestamp: ${timestamp || "MISSING"}`)
    console.log(`🔐 CHECKOUT: Client ID: ${clientId || "MISSING"}`)

    // Validate required fields
    if (!userId) {
      console.error("🔐 CHECKOUT ERROR: Missing userId in request")
      return NextResponse.json({ error: "Missing required field: userId" }, { status: 400 })
    }

    if (!userEmail) {
      console.error("🔐 CHECKOUT ERROR: Missing userEmail in request")
      return NextResponse.json({ error: "Missing required field: userEmail" }, { status: 400 })
    }

    // Verify the user exists in Firestore
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      console.error(`🔐 CHECKOUT ERROR: User ${userId} not found in Firestore`)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log(`🔐 CHECKOUT: User ${userId} verified in Firestore`)

    // Create metadata object with all required fields
    const metadata = {
      firebaseUid: userId,
      email: userEmail,
      plan: "pro",
      timestamp: new Date().toISOString(),
      requestTimestamp: timestamp || new Date().toISOString(),
      clientId: clientId || "not-provided",
    }

    console.log("🔐 CHECKOUT: Prepared metadata:", JSON.stringify(metadata, null, 2))

    // Generate unique success and cancel URLs with timestamp to prevent caching
    const uniqueParam = `t=${Date.now()}`
    const successUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}&${uniqueParam}`
    const cancelUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/cancel?session_id={CHECKOUT_SESSION_ID}&${uniqueParam}`

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
      customer_email: userEmail, // Always set customer_email for consistency
      metadata: metadata, // Add metadata at session level
      subscription_data: {
        metadata: metadata, // Add metadata at subscription level
      },
    })

    console.log(`🔐 CHECKOUT: Created new session with ID: ${session.id}`)

    // Verify the session was created with metadata
    const retrievedSession = await stripe.checkout.sessions.retrieve(session.id)
    console.log("🔐 CHECKOUT: Verified session metadata:", JSON.stringify(retrievedSession.metadata, null, 2))

    // Store session info in Firestore for tracking and debugging
    await db
      .collection("stripeCheckoutSessions")
      .doc(session.id)
      .set({
        userId,
        userEmail,
        sessionId: session.id,
        createdAt: new Date(),
        status: "created",
        metadata: metadata,
        clientId: clientId || "not-provided",
        timestamp: timestamp || new Date().toISOString(),
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
