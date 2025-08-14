import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { adminDb, isFirebaseAdminInitialized } from "@/lib/firebase-admin"
import { processCheckoutSessionCompleted } from "@/lib/stripe/webhook-processor"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  // Basic Firebase check
  if (!isFirebaseAdminInitialized() || !adminDb) {
    console.error("Firebase not initialized")
    return NextResponse.json({ error: "Firebase not initialized" }, { status: 500 })
  }

  // Verify webhook signature
  const buf = await req.text()
  const sig = headers().get("Stripe-Signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Process checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    try {
      await processCheckoutSessionCompleted(session)
      console.log(`Successfully processed checkout for user: ${session.metadata?.buyerUid}`)
    } catch (error) {
      console.error("Failed to process checkout:", error)
      return NextResponse.json({ error: "Processing failed" }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
