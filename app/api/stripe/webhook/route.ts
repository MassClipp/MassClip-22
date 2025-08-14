import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { setCreatorPro } from "@/lib/memberships-service"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
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

    // Only process Creator Pro checkouts
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      // Check if this is a Creator Pro purchase
      if (session.metadata?.plan === "creator_pro" && session.metadata?.buyerUid) {
        const uid = session.metadata.buyerUid
        const email = session.metadata.buyerEmail || session.customer_details?.email

        // Create membership record
        await setCreatorPro(uid, {
          email,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          priceId: session.metadata.priceId || null,
          status: "active",
        })

        console.log(`✅ Created Creator Pro membership for user: ${uid}`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook processing failed:", error)
    return NextResponse.json(
      {
        error: "Processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
