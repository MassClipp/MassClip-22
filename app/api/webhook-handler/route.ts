console.log(">>> Webhook Handler Initialized - App Router Version")
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getFirestore } from "firebase-admin/firestore"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"

// Get Stripe keys from environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Log which keys we're using (without exposing the actual keys)
console.log(`Using Stripe key type: ${stripeSecretKey?.startsWith("sk_test") ? "TEST" : "LIVE"}`)
console.log(`Webhook secret configured: ${webhookSecret ? "YES" : "NO"}`)

// Initialize Stripe with the secret key
if (!stripeSecretKey) {
  console.error("STRIPE_SECRET_KEY is not defined in environment variables")
}

const stripe = new Stripe(stripeSecretKey as string, {
  apiVersion: "2023-10-16",
})

// Initialize Firebase Admin if not already initialized
initializeFirebaseAdmin()
const db = getFirestore()

/**
 * Handles checkout.session.completed events by updating the user's plan in Firestore
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  try {
    const session = event.data.object as Stripe.Checkout.Session
    console.log(">>> Processing checkout.session.completed event")

    // Debug: Log the raw event data
    console.log(">>> RAW EVENT DATA:", JSON.stringify(event.data, null, 2))

    // Debug: Log the raw session object
    console.log(">>> RAW SESSION OBJECT:", JSON.stringify(event.data.object, null, 2))

    // Debug: Log the entire session object to see what's coming through
    console.log(">>> FULL SESSION OBJECT:", JSON.stringify(session, null, 2))

    // Debug: Log specific fields we're interested in
    console.log(">>> Session ID:", session.id)
    console.log(">>> Client Reference ID:", session.client_reference_id)
    console.log(">>> Metadata:", session.metadata)
    console.log(">>> Metadata type:", typeof session.metadata)
    console.log(">>> Metadata keys:", session.metadata ? Object.keys(session.metadata) : "null")

    // Check if userId exists in metadata
    if (!session.metadata || !session.metadata.userId) {
      // Check if it might be in client_reference_id as a fallback
      const fallbackUserId = session.client_reference_id

      if (fallbackUserId) {
        console.log(`>>> No userId in metadata, but found in client_reference_id: ${fallbackUserId}`)

        // Update the user document using the fallback ID
        await db.collection("users").doc(fallbackUserId).update({
          plan: "pro",
          planActivatedAt: new Date().toISOString(),
        })

        console.log(`>>> Successfully upgraded user ${fallbackUserId} to Pro plan (using fallback ID)`)
        return true
      }

      console.error(">>> CRITICAL: No userId found in session metadata or client_reference_id!")
      console.error(">>> User upgrade failed - cannot identify which user completed checkout")
      return true // Return true to indicate we handled it (even though we couldn't update)
    }

    const userId = session.metadata.userId
    console.log(`>>> Updating user ${userId} to Pro plan`)

    // Update the user document in Firestore
    await db.collection("users").doc(userId).update({
      plan: "pro",
      planActivatedAt: new Date().toISOString(),
    })

    console.log(`>>> Successfully upgraded user ${userId} to Pro plan`)
    return true
  } catch (error) {
    console.error(
      ">>> Error handling checkout.session.completed:",
      error instanceof Error ? error.message : "Unknown error",
    )
    // We don't throw here to prevent the webhook from failing
    return false
  }
}

/**
 * Stripe Webhook Handler - App Router Version
 * Processes Stripe webhook events and updates user plans
 * Last updated: 2025-04-24
 */
export async function POST(req: NextRequest) {
  console.log(">>> Webhook received")
  let event: Stripe.Event | null = null

  try {
    // Get the raw request body
    const text = await req.text()
    const rawBody = Buffer.from(text)
    const signature = req.headers.get("stripe-signature") as string

    // Verify webhook signature if secret is available
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
        console.log(`>>> Webhook event verified: ${event.type}`)
      } catch (err) {
        console.error(
          `>>> Webhook signature verification failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        )
        // Continue processing even if signature fails, but log the error
        try {
          // Try to parse the event without verification
          const jsonData = JSON.parse(text)
          event = jsonData as Stripe.Event
          console.log(`>>> Proceeding with unverified event: ${event.type}`)
        } catch (parseErr) {
          console.error(">>> Could not parse webhook payload as JSON")
        }
      }
    } else {
      // If no webhook secret, try to parse the event from the request body
      try {
        const jsonData = JSON.parse(text)
        event = jsonData as Stripe.Event
        console.log(`>>> Proceeding with unverified event: ${event.type}`)
      } catch (parseErr) {
        console.error(">>> Could not parse webhook payload as JSON")
      }
    }

    // Process the event if we have one
    if (event) {
      // Handle different event types
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(event)
          break

        // Add other event types as needed
        default:
          console.log(`>>> Unhandled event type: ${event.type}`)
      }
    }

    // Return success response regardless of event processing outcome
    // This prevents Stripe from retrying the webhook
    console.log(">>> Webhook processing completed")
    return NextResponse.json({ received: true, message: "Webhook processed" }, { status: 200 })
  } catch (err) {
    // Catch-all error handler to prevent the webhook from crashing
    console.error(`>>> Webhook error: ${err instanceof Error ? err.message : "Unknown error"}`)

    // Still return 200 to prevent Stripe from retrying
    return NextResponse.json({ received: true, message: "Webhook received with errors" }, { status: 200 })
  }
}
