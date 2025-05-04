import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

// Hardcoded site URL for production
const SITE_URL = "https://massclip.pro"

export async function POST(request: Request) {
  console.log("------------ 💰 CREATE CHECKOUT SESSION START ------------")

  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("💰 CHECKOUT ERROR: Missing STRIPE_SECRET_KEY")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    if (!process.env.STRIPE_PRICE_ID) {
      console.error("💰 CHECKOUT ERROR: Missing STRIPE_PRICE_ID")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Parse the request body
    const requestData = await request.json()
    console.log("💰 CHECKOUT: Request data:", JSON.stringify(requestData, null, 2))

    // Validate required fields
    if (!requestData.userId) {
      console.error("💰 CHECKOUT ERROR: Missing userId in request")
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    if (!requestData.email) {
      console.error("💰 CHECKOUT ERROR: Missing email in request")
      return NextResponse.json({ error: "Missing email" }, { status: 400 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const db = getFirestore()

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Get the success and cancel URLs
    const uniqueParam = `t=${Date.now()}`
    const successUrl = `${SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}&${uniqueParam}`
    const cancelUrl = `${SITE_URL}/subscription/cancel?${uniqueParam}`

    console.log(`💰 CHECKOUT: Success URL: ${successUrl}`)
    console.log(`💰 CHECKOUT: Cancel URL: ${cancelUrl}`)

    // Create metadata object with all required fields
    const metadata = {
      firebaseUid: requestData.userId,
      email: requestData.email,
      timestamp: new Date().toISOString(),
      siteUrl: SITE_URL,
    }

    console.log("💰 CHECKOUT: Metadata:", JSON.stringify(metadata, null, 2))

    // Store the session in Firestore before creating in Stripe
    // This helps with recovery if metadata isn't sent correctly
    const sessionData = {
      userId: requestData.userId,
      email: requestData.email,
      status: "created",
      createdAt: new Date(),
      metadata: metadata,
      siteUrl: SITE_URL,
    }

    console.log("💰 CHECKOUT: Session data for Firestore:", JSON.stringify(sessionData, null, 2))

    // Create the checkout session
    console.log(`💰 CHECKOUT: Creating checkout session for user ${requestData.userId}`)

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
      customer_email: requestData.email,
      metadata: metadata,
      subscription_data: {
        metadata: metadata, // Add metadata to subscription as well
      },
    })

    console.log(`💰 CHECKOUT: Created checkout session with ID: ${session.id}`)

    // Now store the session in Firestore with the Stripe session ID
    try {
      await db
        .collection("stripeCheckoutSessions")
        .doc(session.id)
        .set({
          ...sessionData,
          sessionId: session.id,
        })
      console.log(`💰 CHECKOUT: Stored checkout session in Firestore with ID: ${session.id}`)
    } catch (error) {
      console.error("💰 CHECKOUT ERROR: Failed to store checkout session in Firestore:", error)
      // Continue anyway, as this is not critical
    }

    console.log("------------ 💰 CREATE CHECKOUT SESSION END ------------")
    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error("💰 CHECKOUT ERROR:", error)
    return NextResponse.json({ error: error.message || "Failed to create checkout session" }, { status: 500 })
  }
}
