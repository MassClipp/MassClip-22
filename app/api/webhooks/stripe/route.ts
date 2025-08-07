import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { processCheckoutSessionCompleted } from "@/lib/stripe/webhook-processor"
import { saveConnectedStripeAccount } from "@/lib/stripe-accounts-service"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

// Use the correct environment variable name
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE!

export async function POST(req: NextRequest) {
  console.log("🚀 Stripe webhook received")

  try {
    // Get raw body as text
    const body = await req.text()
    const signature = req.headers.get("stripe-signature")

    if (!signature) {
      console.error("❌ Missing Stripe signature")
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    // Validate webhook secret
    if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
      console.error("❌ Invalid webhook secret format")
      console.error("- Looking for: STRIPE_WEBHOOK_SECRET_LIVE")
      console.error("- Found:", !!webhookSecret)
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 500 })
    }

    console.log("🔍 Webhook verification details:")
    console.log("- Body length:", body.length)
    console.log("- Has signature:", !!signature)
    console.log("- Using STRIPE_WEBHOOK_SECRET_LIVE")
    console.log("- Webhook secret format: whsec_***")

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log("✅ Webhook signature verified successfully!")
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:")
      console.error("- Error message:", err.message)
      console.error("- Error type:", err.type)

      return NextResponse.json(
        {
          error: `Webhook signature verification failed: ${err.message}`,
          debug: {
            hasSecret: !!webhookSecret,
            hasSignature: !!signature,
            bodyLength: body.length,
            secretFormat: webhookSecret.startsWith("whsec_") ? "correct" : "invalid",
            errorType: err.type,
          },
        },
        { status: 400 },
      )
    }

    console.log(`🎯 Processing event: ${event.type} (${event.id})`)

    switch (event.type) {
      case "checkout.session.completed":
        try {
          const result = await processCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)

          if (result.alreadyProcessed) {
            return NextResponse.json({ received: true, message: "Already processed" })
          }

          return NextResponse.json({
            received: true,
            message: "Purchase processed successfully",
            ...result,
          })
        } catch (error: any) {
          console.error("❌ Error processing checkout session:", error.message)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case "account.updated":
        try {
          const account = event.data.object as Stripe.Account
          console.log(`🔄 Processing account.updated for account: ${account.id}`)

          // Find the user associated with this Stripe account
          const accountsSnapshot = await adminDb
            .collection("connectedStripeAccounts")
            .where("stripeAccountId", "==", account.id)
            .get()

          if (accountsSnapshot.empty) {
            console.log(`ℹ️ No user found for Stripe account: ${account.id}`)
            return NextResponse.json({ received: true, message: "Account not found in our records" })
          }

          // Update all matching accounts (should be just one)
          for (const doc of accountsSnapshot.docs) {
            const userId = doc.id
            console.log(`🔄 Updating connected account for user: ${userId}`)
            await saveConnectedStripeAccount(userId, account)
          }

          return NextResponse.json({
            received: true,
            message: "Account updated successfully",
          })
        } catch (error: any) {
          console.error("❌ Error processing account.updated:", error.message)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
        return NextResponse.json({ received: true })
    }
  } catch (error: any) {
    console.error("❌ Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed", details: error.message }, { status: 500 })
  }
}
