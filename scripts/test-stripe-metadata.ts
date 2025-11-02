import Stripe from "stripe"

/**
 * This script tests the propagation of metadata from Checkout Session to Subscription and Payment Intent
 * Run with: npx ts-node scripts/test-stripe-metadata.ts
 */

async function testStripeMetadata() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Missing STRIPE_SECRET_KEY environment variable")
    process.exit(1)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  })

  try {
    console.log("Creating test checkout session with metadata...")

    const metadata = {
      firebaseUid: "test-user-id-" + Date.now(),
      email: "test@example.com",
      plan: "pro",
      timestamp: new Date().toISOString(),
    }

    // Create a test checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID || "price_1234", // Replace with a test price ID
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: "https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://example.com/cancel?session_id={CHECKOUT_SESSION_ID}",
      customer_email: "test@example.com",
      metadata: metadata,
      subscription_data: {
        metadata: metadata,
      },
      payment_intent_data: {
        metadata: metadata,
      },
    })

    console.log("Test session created with ID:", session.id)
    console.log("Session metadata:", JSON.stringify(session.metadata, null, 2))

    // Retrieve the session to check metadata
    const retrievedSession = await stripe.checkout.sessions.retrieve(session.id)
    console.log("Retrieved session metadata:", JSON.stringify(retrievedSession.metadata, null, 2))

    console.log("\nIMPORTANT: To complete the test, go to the Stripe Dashboard and check if metadata appears on:")
    console.log("1. The Checkout Session (ID:", session.id, ")")
    console.log("2. The resulting Subscription (after completing payment)")
    console.log("3. The resulting Payment Intent (after completing payment)")
    console.log("\nCheckout URL:", session.url)
  } catch (error) {
    console.error("Error testing Stripe metadata:", error)
  }
}

testStripeMetadata().catch(console.error)
