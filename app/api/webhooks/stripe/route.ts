import Stripe from "stripe"
import type { NextApiRequest, NextApiResponse } from "next"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const sig = req.headers["stripe-signature"]!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`)
      return
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(session)
        break
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    res.json({ received: true })
  } else {
    res.setHeader("Allow", "POST")
    res.status(405).end("Method Not Allowed")
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log("🔍 [Webhook] Processing checkout session:", session.id)

    // Extract metadata - now includes the actual Firebase UID
    const { bundleId, productBoxId, userId, buyerUid, userEmail, creatorId } = session.metadata || {}

    // Use the correct field names from metadata
    const finalBundleId = bundleId || productBoxId
    const finalUserId = userId || buyerUid

    if (!finalBundleId) {
      console.error("❌ [Webhook] Missing bundle/product ID in session metadata:", session.id)
      return
    }

    if (!finalUserId || finalUserId === "anonymous") {
      console.error("❌ [Webhook] Missing or anonymous user ID in session metadata:", session.id)
      // Still process but log the issue
    }

    console.log("✅ [Webhook] Session metadata:", {
      bundleId: finalBundleId,
      userId: finalUserId,
      userEmail,
      creatorId,
    })

    // Complete the purchase with the proper user ID from metadata
    const completeResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/purchase/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        buyerUid: finalUserId,
        productBoxId: finalBundleId,
        sessionId: session.id,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        userEmail: userEmail || session.customer_email,
      }),
    })

    if (!completeResponse.ok) {
      console.error("❌ [Webhook] Failed to complete purchase:", await completeResponse.text())
      return
    }

    console.log(`✅ [Webhook] Successfully processed webhook for session: ${session.id} with user: ${finalUserId}`)
  } catch (error) {
    console.error("❌ [Webhook] Error handling checkout.session.completed:", error)
    throw error
  }
}
