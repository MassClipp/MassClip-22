import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import { auth } from "firebase-admin"

// Initialize Firebase Admin
initializeFirebaseAdmin()
const db = getFirestore()

// Site URL for redirects
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro"

export async function POST(request: Request) {
  console.log("------------ 🛒 CREATE CHECKOUT SESSION START ------------")

  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("🛒 CHECKOUT ERROR: Missing STRIPE_SECRET_KEY")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Parse the request body
    const requestData = await request.json()
    console.log("🛒 CHECKOUT: Request data:", JSON.stringify(requestData, null, 2))

    // Validate required fields
    if (!requestData.priceId) {
      console.error("🛒 CHECKOUT ERROR: Missing priceId in request")
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 })
    }

    if (!requestData.creatorId) {
      console.error("🛒 CHECKOUT ERROR: Missing creatorId in request")
      return NextResponse.json({ error: "Missing creatorId" }, { status: 400 })
    }

    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    let buyerId = null
    let buyerEmail = requestData.buyerEmail

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const idToken = authHeader.split("Bearer ")[1]
        const decodedToken = await auth().verifyIdToken(idToken)
        buyerId = decodedToken.uid

        // Get buyer email if not provided
        if (!buyerEmail) {
          const buyerDoc = await db.collection("users").doc(buyerId).get()
          if (buyerDoc.exists) {
            buyerEmail = buyerDoc.data()?.email
          }
        }
      } catch (error) {
        console.error("🛒 CHECKOUT ERROR: Invalid ID token:", error)
        // Continue without authentication for public access
      }
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Get creator information
    const creatorDoc = await db.collection("users").doc(requestData.creatorId).get()
    if (!creatorDoc.exists) {
      console.error(`🛒 CHECKOUT ERROR: Creator ${requestData.creatorId} does not exist in Firestore`)
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()
    const paymentMode = creatorData.paymentMode || "one-time"

    // Create metadata for the checkout session
    const metadata = {
      creatorId: requestData.creatorId,
      buyerId: buyerId || "guest",
      buyerEmail: buyerEmail || "guest@example.com",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    }

    console.log("🛒 CHECKOUT: Metadata:", JSON.stringify(metadata, null, 2))

    // Set success and cancel URLs
    const uniqueParam = `t=${Date.now()}`
    const successUrl = `${SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}&${uniqueParam}`
    const cancelUrl = `${SITE_URL}/purchase/cancel?${uniqueParam}`

    // Create the checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: requestData.priceId,
          quantity: 1,
        },
      ],
      mode: paymentMode === "subscription" ? "subscription" : "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata,
    }

    // Add customer email if available
    if (buyerEmail) {
      sessionParams.customer_email = buyerEmail
    }

    // Add subscription data for subscription mode
    if (paymentMode === "subscription") {
      sessionParams.subscription_data = {
        metadata: metadata,
      }
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionParams)
    console.log(`🛒 CHECKOUT: Created checkout session with ID: ${session.id}`)

    // Store the session in Firestore
    await db
      .collection("checkoutSessions")
      .doc(session.id)
      .set({
        sessionId: session.id,
        creatorId: requestData.creatorId,
        buyerId: buyerId || "guest",
        buyerEmail: buyerEmail || "guest@example.com",
        priceId: requestData.priceId,
        mode: paymentMode,
        status: "created",
        createdAt: new Date(),
        metadata: metadata,
        checkoutUrl: session.url,
      })

    console.log("------------ 🛒 CREATE CHECKOUT SESSION END ------------")
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error("🛒 CHECKOUT ERROR:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to create checkout session",
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
