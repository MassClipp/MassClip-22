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

      // Try to get the user ID from various sources
      let userId = null
      let email = null

      // Method 1: Try to get from session metadata
      if (session.metadata && session.metadata.firebaseUid) {
        userId = session.metadata.firebaseUid
        email = session.metadata.email || session.customer_email
        console.log(`🪝 WEBHOOK: Found user ID ${userId} in session metadata`)
      }
      // Method 2: Try to get from stored session in Firestore
      else {
        try {
          const sessionDoc = await firestore.collection("stripeCheckoutSessions").doc(session.id).get()
          if (sessionDoc.exists) {
            const sessionData = sessionDoc.data()
            userId = sessionData?.userId
            email = sessionData?.email
            console.log(`🪝 WEBHOOK: Found user ID ${userId} from stored session in Firestore`)
          }
        } catch (error) {
          console.error("🪝 WEBHOOK ERROR: Failed to get session from Firestore:", error)
        }
      }

      // If we still don't have a user ID, try to find by customer ID
      if (!userId && session.customer) {
        try {
          const customerId = typeof session.customer === "string" ? session.customer : session.customer.id
          const userQuery = await firestore
            .collection("users")
            .where("stripeCustomerId", "==", customerId)
            .limit(1)
            .get()

          if (!userQuery.empty) {
            userId = userQuery.docs[0].id
            console.log(`🪝 WEBHOOK: Found user ID ${userId} by customer ID ${customerId}`)
          }
        } catch (error) {
          console.error("🪝 WEBHOOK ERROR: Failed to query user by customer ID:", error)
        }
      }

      // If we have a user ID, update their permissions
      if (userId) {
        try {
          // Update user permissions in Firestore
          await firestore
            .collection("users")
            .doc(userId)
            .update({
              plan: "creator-pro",
              permissions: {
                download: true,
                premium: true,
              },
              updatedAt: new Date(),
              paymentStatus: "active",
            })

          console.log(`🪝 WEBHOOK: Updated permissions for user ${userId} to creator-pro`)

          // Store the subscription info
          if (session.subscription) {
            const subscriptionId =
              typeof session.subscription === "string" ? session.subscription : session.subscription.id

            await firestore.collection("users").doc(userId).collection("subscriptions").doc(subscriptionId).set({
              subscriptionId,
              status: "active",
              createdAt: new Date(),
              plan: "creator-pro",
              customerId: session.customer,
            })

            console.log(`🪝 WEBHOOK: Stored subscription ${subscriptionId} for user ${userId}`)
          }

          // Log the successful payment
          await firestore.collection("payments").add({
            userId,
            email,
            amount: session.amount_total,
            currency: session.currency,
            status: "completed",
            sessionId: session.id,
            timestamp: new Date(),
          })

          console.log(`🪝 WEBHOOK: Logged payment for user ${userId}`)
        } catch (error) {
          console.error(`🪝 WEBHOOK ERROR: Failed to update user ${userId}:`, error)
          return NextResponse.json(
            { error: `Failed to update user permissions: ${error instanceof Error ? error.message : "Unknown error"}` },
            { status: 500 },
          )
        }
      } else {
        console.error("🪝 WEBHOOK ERROR: Could not find user ID from session or customer")
        return NextResponse.json({ error: "Could not find user ID" }, { status: 400 })
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
