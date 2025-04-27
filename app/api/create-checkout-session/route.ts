import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

export async function POST(request: Request) {
  console.log("------------ APP ROUTER CHECKOUT SESSION START ------------")
  console.log("Request received at:", new Date().toISOString())

  // Check for required environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Missing environment variable: STRIPE_SECRET_KEY")
    return NextResponse.json({ error: "Server configuration error: Missing Stripe secret key" }, { status: 500 })
  }

  if (!process.env.STRIPE_PRICE_ID) {
    console.error("Missing environment variable: STRIPE_PRICE_ID")
    return NextResponse.json({ error: "Server configuration error: Missing Stripe price ID" }, { status: 500 })
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    console.error("Missing environment variable: NEXT_PUBLIC_SITE_URL")
    return NextResponse.json({ error: "Server configuration error: Missing site URL" }, { status: 500 })
  }

  try {
    // Initialize Stripe with the secret key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Parse the request body
    const body = await request.json()
    console.log("Request body:", JSON.stringify(body))

    // Get the user email from the request body
    const { userId, userEmail, email } = body || {}

    // Try to get email from different possible properties
    const customerEmail = userEmail || email || body?.user?.email

    if (!customerEmail) {
      console.error("MISSING EMAIL - Request body:", JSON.stringify(body))
      return NextResponse.json({ error: "Missing email in request body" }, { status: 400 })
    }

    if (!userId) {
      console.warn("⚠️ WARNING: Missing userId in request body.")
      console.warn("Request body:", JSON.stringify(body))
      return NextResponse.json({ error: "Missing userId in request body" }, { status: 400 })
    }

    console.log(`Creating checkout session for email: ${customerEmail}`)
    console.log(`User ID for reference: ${userId}`)
    console.log("Using price ID:", process.env.STRIPE_PRICE_ID)

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const db = getFirestore()

    // Generate a unique reference ID
    const referenceId = `${userId}_${Date.now()}`

    // Store the reference in Firestore BEFORE creating the checkout session
    await db.collection("stripeReferences").doc(referenceId).set({
      userId: userId,
      email: customerEmail,
      createdAt: new Date(),
      used: false,
    })

    console.log(`Created reference record in Firestore with ID: ${referenceId}`)

    // Create session parameters
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
      client_reference_id: referenceId, // Use our reference ID here
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}&ref=${referenceId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/cancel?session_id={CHECKOUT_SESSION_ID}&ref=${referenceId}`,
    })

    console.log("Session created with ID:", session.id)
    console.log("Session URL:", session.url)
    console.log("Reference ID:", referenceId)

    // Log to Firestore for audit trail
    try {
      await db.collection("stripeCheckoutLogs").add({
        timestamp: new Date(),
        userId: userId,
        email: customerEmail,
        sessionId: session.id,
        referenceId: referenceId,
        success: true,
        mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ? "test" : "live",
      })

      console.log("Created checkout log entry in Firestore")
    } catch (logError) {
      console.error("Error creating log entry:", logError)
      // Continue even if logging fails
    }

    console.log("------------ APP ROUTER CHECKOUT SESSION END ------------")

    // Return the session URL
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Stripe session error:", error)
    console.error("Error message:", error instanceof Error ? error.message : "Unknown error")

    // Try to log the error to Firestore
    try {
      const { getFirestore } = await import("firebase-admin/firestore")
      const { initializeFirebaseAdmin } = await import("@/lib/firebase-admin")

      initializeFirebaseAdmin()
      const db = getFirestore()

      await db.collection("stripeCheckoutErrors").add({
        timestamp: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : null,
        requestBody: request.body ? await request.clone().text() : null,
        mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ? "test" : "live",
      })

      console.log("Created error log entry in Firestore")
    } catch (logError) {
      console.error("Error creating error log entry:", logError)
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? `Stripe checkout error: ${error.message}` : "An unknown error occurred",
      },
      { status: 500 },
    )
  }
}
