import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// Disable the default body parser to get raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("❌ STRIPE_WEBHOOK_SECRET is not set in environment variables")
      console.error("Please add STRIPE_WEBHOOK_SECRET to your Vercel environment variables")
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
      console.log("✅ Webhook signature verified successfully")
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      console.log("🎉 Checkout session completed:", {
        sessionId: session.id,
        customerId: session.customer,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentStatus: session.payment_status,
        metadata: session.metadata,
      })

      // TODO: Add your business logic here
      // Examples:
      // - Update user's purchase records in your database
      // - Grant access to purchased content
      // - Send confirmation email
      // - Update user's subscription status

      return NextResponse.json({ received: true, sessionId: session.id }, { status: 200 })
    }

    // Handle other event types if needed
    console.log(`ℹ️ Unhandled event type: ${event.type}`)
    return NextResponse.json({ received: true, message: `Unhandled event type: ${event.type}` }, { status: 200 })
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

1. Environment Variables:
   Make sure to add STRIPE_WEBHOOK_SECRET to your Vercel environment variables.
   You can get this from your Stripe Dashboard > Webhooks > [Your Webhook] > Signing secret

2. Webhook Endpoint URL:
   Configure this URL in your Stripe Dashboard:
   https://your-domain.com/api/webhooks/stripe

3. Events to Listen For:
   In your Stripe webhook configuration, make sure to select:
   - checkout.session.completed

4. Testing:
   You can test this webhook using Stripe CLI:
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   stripe trigger checkout.session.completed
*/
