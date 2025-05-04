import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import type FirebaseFirestore from "firebase-admin"

export async function POST(request: Request) {
  console.log("------------ 🔔 WEBHOOK HANDLER START ------------")

  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("🔔 WEBHOOK ERROR: Missing STRIPE_SECRET_KEY")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("🔔 WEBHOOK ERROR: Missing STRIPE_WEBHOOK_SECRET")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Get the webhook secret
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    // Get request payload and signature
    let payload
    try {
      payload = await request.text()
      console.log(`🔔 WEBHOOK: Received payload (${payload.length} bytes)`)
    } catch (error) {
      console.error("🔔 WEBHOOK ERROR: Failed to read request payload:", error)
      return NextResponse.json({ error: "Failed to read request payload" }, { status: 400 })
    }

    const sig = request.headers.get("stripe-signature")
    if (!sig) {
      console.error("🔔 WEBHOOK ERROR: Missing Stripe signature")
      return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 })
    }

    // Verify Stripe signature
    let event
    try {
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret)
      console.log(`🔔 WEBHOOK: Event verified: ${event.type} (${event.id})`)
    } catch (err: any) {
      console.error(`🔔 WEBHOOK ERROR: Signature verification failed: ${err.message}`)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    // Initialize Firebase
    try {
      initializeFirebaseAdmin()
      console.log("🔔 WEBHOOK: Firebase initialized")
    } catch (error) {
      console.error("🔔 WEBHOOK ERROR: Failed to initialize Firebase:", error)
      return NextResponse.json({ error: "Failed to initialize Firebase" }, { status: 500 })
    }

    const db = getFirestore()

    // IMPORTANT: Store the raw event for debugging and recovery
    try {
      await db
        .collection("stripeWebhookEvents")
        .doc(event.id)
        .set({
          id: event.id,
          type: event.type,
          created: new Date(event.created * 1000),
          receivedAt: new Date(),
          data: JSON.parse(payload),
        })
      console.log(`🔔 WEBHOOK: Stored raw event ${event.id}`)
    } catch (error) {
      console.error("🔔 WEBHOOK ERROR: Failed to store raw event:", error)
      // Continue anyway - this is just for debugging
    }

    // Process events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      console.log(`🔔 WEBHOOK: Processing checkout session: ${session.id}`)

      // Try to get userId from multiple sources
      let userId = session.metadata?.firebaseUid

      // If no userId in metadata, try to find in our database
      if (!userId) {
        console.log(`🔔 WEBHOOK: No userId in metadata, checking Firestore for session ${session.id}`)

        try {
          // First try: lookup by session ID
          const sessionDoc = await db.collection("stripeCheckoutSessions").doc(session.id).get()

          if (sessionDoc.exists) {
            userId = sessionDoc.data()?.userId
            console.log(`🔔 WEBHOOK: Found userId ${userId} in Firestore session record`)
          } else {
            // Second try: lookup by customer ID
            const customerId = session.customer as string
            console.log(`🔔 WEBHOOK: Looking up user by customer ID: ${customerId}`)

            const usersSnapshot = await db
              .collection("users")
              .where("stripeCustomerId", "==", customerId)
              .limit(1)
              .get()

            if (!usersSnapshot.empty) {
              userId = usersSnapshot.docs[0].id
              console.log(`🔔 WEBHOOK: Found userId ${userId} by customer ID`)
            }
          }
        } catch (error) {
          console.error("🔔 WEBHOOK ERROR: Failed to query Firestore:", error)
        }
      }

      if (!userId) {
        console.error("🔔 WEBHOOK ERROR: Could not determine userId from session")
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Update the user to creator_pro
      try {
        await updateUserPlan(db, userId, session)
        console.log(`🔔 WEBHOOK: Successfully updated user ${userId} to creator_pro`)
        return NextResponse.json({ success: true })
      } catch (error) {
        console.error("🔔 WEBHOOK ERROR: Failed to update user:", error)
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
      }
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription
      console.log(`🔔 WEBHOOK: Processing subscription deletion: ${subscription.id}`)

      // Try to get userId from metadata or by customer ID lookup
      let userId = subscription.metadata?.firebaseUid

      if (!userId) {
        try {
          const customerId = subscription.customer as string
          console.log(`🔔 WEBHOOK: Looking up user by customer ID: ${customerId}`)

          const usersSnapshot = await db.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get()

          if (!usersSnapshot.empty) {
            userId = usersSnapshot.docs[0].id
            console.log(`🔔 WEBHOOK: Found userId ${userId} by customer ID`)
          }
        } catch (error) {
          console.error("🔔 WEBHOOK ERROR: Failed to query Firestore:", error)
        }
      }

      if (!userId) {
        console.error("🔔 WEBHOOK ERROR: Could not determine userId from subscription")
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Downgrade the user
      try {
        await downgradeUser(db, userId)
        console.log(`🔔 WEBHOOK: Successfully downgraded user ${userId} to free`)
        return NextResponse.json({ success: true })
      } catch (error) {
        console.error("🔔 WEBHOOK ERROR: Failed to downgrade user:", error)
        return NextResponse.json({ error: "Failed to downgrade user" }, { status: 500 })
      }
    } else {
      // Just acknowledge other event types
      console.log(`🔔 WEBHOOK: Received event type ${event.type} (not processed)`)
      return NextResponse.json({ received: true })
    }
  } catch (error: any) {
    console.error("🔔 WEBHOOK ERROR: Unhandled exception:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  } finally {
    console.log("------------ 🔔 WEBHOOK HANDLER END ------------")
  }
}

/**
 * Updates a user to creator_pro plan
 */
async function updateUserPlan(db: FirebaseFirestore.Firestore, userId: string, session: Stripe.Checkout.Session) {
  console.log(`🔔 WEBHOOK: Updating user ${userId} to creator_pro`)

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  const updateData = {
    plan: "creator_pro",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    subscriptionUpdatedAt: new Date(),
    subscriptionStatus: "active",
    hasAccess: true,
    metadata: {
      checkoutSessionId: session.id,
      upgradedAt: new Date().toISOString(),
    },
  }

  console.log(`🔔 WEBHOOK: Update data:`, JSON.stringify(updateData, null, 2))

  // Update the user
  await db.collection("users").doc(userId).update(updateData)

  // Log the event
  await db.collection("subscriptionEvents").add({
    userId,
    eventType: "subscription_created",
    subscriptionId: subscriptionId,
    checkoutSessionId: session.id,
    timestamp: new Date().toISOString(),
  })

  // Update the stored session if it exists
  const sessionDoc = await db.collection("stripeCheckoutSessions").doc(session.id).get()
  if (sessionDoc.exists) {
    await db.collection("stripeCheckoutSessions").doc(session.id).update({
      status: "completed",
      completedAt: new Date(),
      subscriptionId: subscriptionId,
    })
  }
}

/**
 * Downgrades a user to free plan
 */
async function downgradeUser(db: FirebaseFirestore.Firestore, userId: string) {
  console.log(`🔔 WEBHOOK: Downgrading user ${userId} to free`)

  const updateData = {
    plan: "free",
    stripeSubscriptionId: null,
    subscriptionUpdatedAt: new Date(),
    subscriptionStatus: "canceled",
    hasAccess: false,
    metadata: {
      downgradedAt: new Date().toISOString(),
    },
  }

  // Update the user
  await db.collection("users").doc(userId).update(updateData)

  // Log the event
  await db.collection("subscriptionEvents").add({
    userId,
    eventType: "subscription_canceled",
    timestamp: new Date().toISOString(),
  })
}
