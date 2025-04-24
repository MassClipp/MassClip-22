console.log(">>> Webhook Handler Initialized - App Router Version")
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

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

/**
 * Simplified Stripe Webhook Handler - App Router Version
 * This is a minimal version to confirm the webhook is being hit
 * Last updated: 2025-04-23
 */
export async function POST(req: NextRequest) {
  console.log(">>> Webhook received")

  try {
    // Get the raw request body
    // Note: In App Router, we need to use req.text() instead of buffer(req)
    const text = await req.text()
    const rawBody = Buffer.from(text)
    const signature = req.headers.get("stripe-signature") as string

    // Verify webhook signature if secret is available
    if (webhookSecret) {
      try {
        const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
        console.log(`>>> Webhook event verified: ${event.type}`)

        // Log the event data for debugging
        console.log(
          ">>> Event data:",
          JSON.stringify({
            type: event.type,
            id: event.id,
            object: event.object,
            api_version: event.api_version,
            created: event.created,
          }),
        )
      } catch (err) {
        console.error(
          `>>> Webhook signature verification failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        )
        // Continue processing even if signature fails - we just want to confirm the endpoint is hit
      }
    }

    // Log request headers for debugging
    console.log(
      ">>> Request headers:",
      JSON.stringify({
        "content-type": req.headers.get("content-type"),
        "stripe-signature": req.headers.get("stripe-signature") ? "Present" : "Missing",
        "user-agent": req.headers.get("user-agent"),
      }),
    )

    // Return success response
    console.log(">>> Webhook test passed")
    return NextResponse.json({ received: true, message: "Webhook test passed" }, { status: 200 })
  } catch (err) {
    console.error(`>>> Webhook error: ${err instanceof Error ? err.message : "Unknown error"}`)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
