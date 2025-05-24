import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin outside the handler for better performance
let firebaseInitialized = false
let db: FirebaseFirestore.Firestore | null = null

function initFirebase() {
  if (!firebaseInitialized) {
    try {
      initializeFirebaseAdmin()
      db = getFirestore()
      firebaseInitialized = true
      console.log("🔥 Firebase initialized successfully in webhook handler")
    } catch (error) {
      console.error("🔥 Firebase initialization error:", error)
      throw error
    }
  }
  return db
}

export async function POST(request: Request) {
  console.log("------------ 🪝 WEBHOOK HANDLER START ------------")

  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("🪝 WEBHOOK ERROR: Missing STRIPE_SECRET_KEY")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("🪝 WEBHOOK ERROR: Missing STRIPE_WEBHOOK_SECRET")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Initialize Firebase
    const firestore = initFirebase()

    // Get the raw request body as text
    const payload = await request.text()
    const sig = request.headers.get("stripe-signature")

    if (!sig) {
      console.error("🪝 WEBHOOK ERROR: Missing stripe-signature header")
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET)
      console.log(`🪝 WEBHOOK: Received event type: ${event.type}`)
    } catch (err: any) {
      console.error(`🪝 WEBHOOK ERROR: Signature verification failed: ${err.message}`)
      return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
    }

    // Store the raw event for debugging
    try {
      await firestore.collection("stripeWebhookEvents").add({
        eventType: event.type,
        eventId: event.id,
        timestamp: new Date(),
        rawEvent: JSON.parse(payload),
      })
      console.log(`🪝 WEBHOOK: Stored raw event ${event.id} in Firestore`)
    } catch (error) {
      console.error("🪝 WEBHOOK ERROR: Failed to store raw event:", error)
      // Continue anyway, as this is not critical
    }

    // Handle the event based on its type
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      console.log(`🪝 WEBHOOK: Processing checkout.session.completed for session ${session.id}`)

      // Check if this is a premium content purchase
      if (session.metadata?.creatorId && session.metadata?.buyerId) {
        try {
          console.log(`🪝 WEBHOOK: Processing premium content purchase for creator ${session.metadata.creatorId}`)

          const buyerId = session.metadata.buyerId
          const creatorId = session.metadata.creatorId

          // Grant access to premium content
          await firestore
            .collection("userAccess")
            .doc(buyerId)
            .set(
              {
                creatorId: creatorId,
                accessGranted: true,
                purchaseDate: new Date(),
                sessionId: session.id,
                paymentMode: session.mode,
                subscriptionId: session.subscription || null,
              },
              { merge: true },
            )

          console.log(`🪝 WEBHOOK: Granted premium access to user ${buyerId} for creator ${creatorId}`)

          // Update the checkout session in Firestore
          await firestore.collection("premiumCheckoutSessions").doc(session.id).update({
            status: "completed",
            completedAt: new Date(),
          })

          console.log(`🪝 WEBHOOK: Updated premium checkout session ${session.id} to completed`)

          // Record the sale for the creator
          await firestore
            .collection("users")
            .doc(creatorId)
            .collection("sales")
            .add({
              buyerId: buyerId,
              sessionId: session.id,
              amount: session.amount_total! / 100, // Convert from cents to dollars
              platformFee: Math.round(session.amount_total! * 0.1) / 100, // 10% platform fee
              netAmount: (session.amount_total! - Math.round(session.amount_total! * 0.1)) / 100, // Net amount after platform fee
              purchasedAt: new Date(),
              status: "completed",
              paymentMode: session.mode,
              subscriptionId: session.subscription || null,
              isRecurring: session.mode === "subscription",
            })

          console.log(`🪝 WEBHOOK: Recorded sale for creator ${creatorId}`)
        } catch (error) {
          console.error("🪝 WEBHOOK ERROR: Failed to process premium content purchase:", error)
        }
      }
      // Handle regular subscription checkout (existing code)
      else if (session.metadata && session.metadata.firebaseUid) {
        // Your existing subscription handling code...
      }
    }
    // Handle subscription updated/deleted events if needed
    else if (event.type === "customer.subscription.updated") {
      // Handle subscription updates
      console.log(`🪝 WEBHOOK: Received customer.subscription.updated event`)
      // Implementation omitted for brevity
    } else if (event.type === "customer.subscription.deleted") {
      // Handle subscription cancellations
      console.log(`🪝 WEBHOOK: Received customer.subscription.deleted event`)
      // Implementation omitted for brevity
    }

    console.log("------------ 🪝 WEBHOOK HANDLER END ------------")
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("🪝 WEBHOOK ERROR:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error in webhook handler" },
      { status: 500 },
    )
  }
}
