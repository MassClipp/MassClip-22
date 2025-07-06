import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    // Determine which webhook secret to use based on environment
    const isTestMode = process.env.STRIPE_SECRET_KEY?.includes("sk_test_")
    const webhookSecret = isTestMode ? process.env.STRIPE_WEBHOOK_SECRET_TEST : process.env.STRIPE_WEBHOOK_SECRET_LIVE

    if (!webhookSecret) {
      const missingSecret = isTestMode ? "STRIPE_WEBHOOK_SECRET_TEST" : "STRIPE_WEBHOOK_SECRET_LIVE"
      console.error(`❌ ${missingSecret} is not set in environment variables`)
      console.error(`Current mode: ${isTestMode ? "TEST" : "LIVE"}`)
      console.error("Please add the appropriate webhook secret to your Vercel environment variables")
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    if (!signature) {
      console.error("❌ No Stripe signature found in request headers")
      return NextResponse.json({ error: "No signature provided" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`✅ Webhook signature verified successfully (${isTestMode ? "TEST" : "LIVE"} mode)`)
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err)
      console.error(`Mode: ${isTestMode ? "TEST" : "LIVE"}`)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`🎉 Checkout session completed (${isTestMode ? "TEST" : "LIVE"} mode):`, {
        sessionId: session.id,
        customerId: session.customer,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentStatus: session.payment_status,
        metadata: session.metadata,
        mode: session.mode,
        isTestMode,
      })

      // TODO: Add your business logic here
      // Examples:
      // - Update user's purchase records in your database
      // - Grant access to purchased content
      // - Send confirmation email
      // - Update user's subscription status

      // You might want to handle test vs live purchases differently
      if (isTestMode) {
        console.log("🧪 This is a test purchase - consider adding test-specific logic")
      } else {
        console.log("💰 This is a live purchase - processing real transaction")
      }

      return NextResponse.json(
        {
          received: true,
          sessionId: session.id,
          mode: isTestMode ? "test" : "live",
        },
        { status: 200 },
      )
    }

    // Handle other event types if needed
    console.log(`ℹ️ Unhandled event type: ${event.type} (${isTestMode ? "TEST" : "LIVE"} mode)`)
    return NextResponse.json(
      {
        received: true,
        message: `Unhandled event type: ${event.type}`,
        mode: isTestMode ? "test" : "live",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("❌ Webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

/*
IMPORTANT SETUP NOTES:

1. Environment Variables (✅ Already configured):
   - STRIPE_WEBHOOK_SECRET_LIVE: For production webhooks
   - STRIPE_WEBHOOK_SECRET_TEST: For test webhooks
   - STRIPE_SECRET_KEY: Your main Stripe secret key
   - STRIPE_SECRET_KEY_TEST: Your test Stripe secret key

2. Webhook Endpoint URLs:
   Configure these URLs in your Stripe Dashboard:
   
   TEST MODE:
   https://your-domain.com/api/webhooks/stripe
   
   LIVE MODE:
   https://your-domain.com/api/webhooks/stripe
   
   (Same URL, but different webhook secrets will be used automatically)

3. Events to Listen For:
   In both your test and live Stripe webhook configurations, select:
   - checkout.session.completed

4. Testing:
   You can test this webhook using Stripe CLI:
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   stripe trigger checkout.session.completed

5. Mode Detection:
   The webhook automatically detects if you're in test or live mode based on your
   STRIPE_SECRET_KEY and uses the appropriate webhook secret accordingly.
*/
