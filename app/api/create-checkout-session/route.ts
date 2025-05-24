import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

// Hardcoded site URL for production - ALWAYS use massclip.pro
const SITE_URL = "https://massclip.pro"

export async function POST(request: Request) {
  console.log("------------ 💰 CREATE CHECKOUT SESSION START ------------")

  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("💰 CHECKOUT ERROR: Missing STRIPE_SECRET_KEY")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Parse the request body
    const requestData = await request.json()
    console.log("💰 CHECKOUT: Request data:", JSON.stringify(requestData, null, 2))

    // Validate required fields
    if (!requestData.priceId) {
      console.error("💰 CHECKOUT ERROR: Missing priceId in request")
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 })
    }

    if (!requestData.creatorId) {
      console.error("💰 CHECKOUT ERROR: Missing creatorId in request")
      return NextResponse.json({ error: "Missing creatorId" }, { status: 400 })
    }

    if (!requestData.buyerEmail) {
      console.error("💰 CHECKOUT ERROR: Missing buyerEmail in request")
      return NextResponse.json({ error: "Missing buyerEmail" }, { status: 400 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const db = getFirestore()

    // Get the creator document to check payment mode
    const creatorDoc = await db.collection("users").doc(requestData.creatorId).get()
    if (!creatorDoc.exists) {
      console.error(`💰 CHECKOUT ERROR: Creator ${requestData.creatorId} does not exist in Firestore`)
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()
    if (!creatorData?.premiumEnabled || !creatorData?.stripePriceId) {
      console.error(`💰 CHECKOUT ERROR: Creator ${requestData.creatorId} has no premium content enabled`)
      return NextResponse.json({ error: "Premium content not available" }, { status: 400 })
    }

    // Verify the price ID matches the creator's price ID
    if (creatorData.stripePriceId !== requestData.priceId) {
      console.error(`💰 CHECKOUT ERROR: Price ID mismatch for creator ${requestData.creatorId}`)
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 })
    }

    // Initialize Stripe with proper error handling
    let stripe: Stripe
    try {
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2023-10-16",
      })
      // Test the connection
      await stripe.customers.list({ limit: 1 })
      console.log("💰 CHECKOUT: Stripe connection successful")
    } catch (stripeError) {
      console.error("💰 CHECKOUT ERROR: Failed to initialize Stripe:", stripeError)
      return NextResponse.json({ error: "Failed to connect to payment provider" }, { status: 500 })
    }

    // Determine the mode based on the creator's payment mode
    const mode = creatorData.paymentMode === "subscription" ? "subscription" : "payment"

    // Get the success and cancel URLs
    const uniqueParam = `t=${Date.now()}`
    const successUrl = `${SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}&${uniqueParam}`
    const cancelUrl = `${SITE_URL}/creator/${creatorData.username || requestData.creatorId}?${uniqueParam}`

    console.log(`💰 CHECKOUT: Success URL: ${successUrl}`)
    console.log(`💰 CHECKOUT: Cancel URL: ${cancelUrl}`)

    // Create metadata object with all required fields
    const metadata = {
      creatorId: requestData.creatorId,
      buyerEmail: requestData.buyerEmail,
      buyerId: requestData.buyerId || "",
      timestamp: new Date().toISOString(),
      siteUrl: SITE_URL,
      environment: "production",
    }

    console.log("💰 CHECKOUT: Metadata:", JSON.stringify(metadata, null, 2))

    // Store the session in Firestore before creating in Stripe
    const sessionData = {
      creatorId: requestData.creatorId,
      buyerEmail: requestData.buyerEmail,
      buyerId: requestData.buyerId || "",
      status: "created",
      createdAt: new Date(),
      metadata: metadata,
      siteUrl: SITE_URL,
      priceId: requestData.priceId,
      mode: mode,
    }

    console.log("💰 CHECKOUT: Session data for Firestore:", JSON.stringify(sessionData, null, 2))

    // Create the checkout session with proper error handling
    console.log(`💰 CHECKOUT: Creating checkout session for creator ${requestData.creatorId}`)
    let session

    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: requestData.priceId,
            quantity: 1,
          },
        ],
        mode: mode,
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: requestData.buyerEmail,
        metadata: metadata,
      })

      console.log(`💰 CHECKOUT: Created checkout session with ID: ${session.id}`)
      console.log(`💰 CHECKOUT: Checkout URL: ${session.url}`)
    } catch (checkoutError: any) {
      console.error("💰 CHECKOUT ERROR: Failed to create checkout session:", checkoutError)
      return NextResponse.json(
        {
          error: `Failed to create checkout session: ${checkoutError.message}`,
          details: checkoutError,
        },
        { status: 500 },
      )
    }

    // Now store the session in Firestore with the Stripe session ID
    try {
      await db
        .collection("premiumCheckoutSessions")
        .doc(session.id)
        .set({
          ...sessionData,
          sessionId: session.id,
          checkoutUrl: session.url,
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
    return NextResponse.json(
      {
        error: error.message || "Failed to create checkout session",
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
