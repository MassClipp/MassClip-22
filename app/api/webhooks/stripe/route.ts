import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = headers()
    const sig = headersList.get("stripe-signature")!

    console.log("🔔 [Stripe Webhook] Received webhook")

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
      console.log("✅ [Stripe Webhook] Event verified:", event.type)
    } catch (err: any) {
      console.error("❌ [Stripe Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
    }

    // Handle successful payment
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      console.log("💳 [Stripe Webhook] Processing completed checkout session:", session.id)
      console.log("💳 [Stripe Webhook] Session metadata:", session.metadata)
      console.log("💳 [Stripe Webhook] Customer details:", {
        customer: session.customer,
        customer_email: session.customer_details?.email,
        customer_name: session.customer_details?.name,
      })

      // Extract purchase details from session
      const productBoxId = session.metadata?.productBoxId || session.metadata?.bundleId
      const buyerUid = session.metadata?.buyerUid || session.metadata?.userId || session.client_reference_id
      const userEmail = session.customer_details?.email || session.metadata?.userEmail
      const userName = session.customer_details?.name || session.metadata?.userName

      console.log("📊 [Stripe Webhook] Extracted purchase details:", {
        productBoxId,
        buyerUid,
        userEmail,
        userName,
        amount: session.amount_total,
        currency: session.currency,
      })

      if (!productBoxId) {
        console.error("❌ [Stripe Webhook] No productBoxId found in session metadata")
        return NextResponse.json({ error: "Missing product information" }, { status: 400 })
      }

      // Call purchase completion endpoint with comprehensive data
      try {
        const completionResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/purchase/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            buyerUid: buyerUid || "anonymous",
            productBoxId,
            sessionId: session.id,
            amount: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents
            currency: session.currency || "usd",
            userEmail,
            userName,
            customerDetails: session.customer_details,
            metadata: session.metadata,
          }),
        })

        if (!completionResponse.ok) {
          const errorText = await completionResponse.text()
          console.error("❌ [Stripe Webhook] Purchase completion failed:", errorText)
          throw new Error(`Purchase completion failed: ${errorText}`)
        }

        const completionResult = await completionResponse.json()
        console.log("✅ [Stripe Webhook] Purchase completion successful:", completionResult)
      } catch (error) {
        console.error("❌ [Stripe Webhook] Error calling purchase completion:", error)
        // Don't return error here - we still want to acknowledge the webhook
      }
    }

    // Handle payment intent succeeded (alternative event)
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log("💰 [Stripe Webhook] Payment intent succeeded:", paymentIntent.id)
      console.log("💰 [Stripe Webhook] Payment intent metadata:", paymentIntent.metadata)

      // Extract details from payment intent
      const productBoxId = paymentIntent.metadata?.productBoxId || paymentIntent.metadata?.bundleId
      const buyerUid = paymentIntent.metadata?.buyerUid || paymentIntent.metadata?.userId
      const userEmail = paymentIntent.metadata?.userEmail
      const userName = paymentIntent.metadata?.userName

      if (productBoxId && buyerUid) {
        console.log("📊 [Stripe Webhook] Processing payment intent completion")

        try {
          const completionResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/purchase/complete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              buyerUid,
              productBoxId,
              sessionId: paymentIntent.id,
              amount: paymentIntent.amount ? paymentIntent.amount / 100 : 0,
              currency: paymentIntent.currency || "usd",
              userEmail,
              userName,
              metadata: paymentIntent.metadata,
            }),
          })

          if (completionResponse.ok) {
            const result = await completionResponse.json()
            console.log("✅ [Stripe Webhook] Payment intent completion successful:", result)
          }
        } catch (error) {
          console.error("❌ [Stripe Webhook] Error processing payment intent:", error)
        }
      }
    }

    console.log("✅ [Stripe Webhook] Webhook processed successfully")
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Stripe Webhook] Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
