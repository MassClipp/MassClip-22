import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin
initializeFirebaseAdmin()
const db = getFirestore()

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  console.log("------------ 🔔 WEBHOOK HANDLER START ------------")

  const payload = await request.text()
  const sig = request.headers.get("stripe-signature") as string

  let event

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret)
  } catch (err: any) {
    console.error(`🔔 WEBHOOK ERROR: Signature verification failed: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  console.log(`🔔 WEBHOOK: Received event type: ${event.type}`)

  // Handle the event
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      console.log(`🔔 WEBHOOK: Processing checkout session: ${session.id}`)

      // Log all metadata for debugging
      console.log("🔔 WEBHOOK: Session metadata:", JSON.stringify(session.metadata || {}, null, 2))

      // Get the user ID from metadata
      const userId = session.metadata?.firebaseUid

      if (!userId) {
        console.error("🔔 WEBHOOK ERROR: No firebaseUid in session metadata")

        // Try to find the session in our database as fallback
        const sessionDoc = await db.collection("stripeCheckoutSessions").doc(session.id).get()

        if (sessionDoc.exists) {
          const sessionData = sessionDoc.data()
          const fallbackUserId = sessionData?.userId

          if (fallbackUserId) {
            console.log(`🔔 WEBHOOK: Found userId in Firestore: ${fallbackUserId}`)
            await updateUserToPro(fallbackUserId, session)
            return NextResponse.json({ received: true })
          }
        }

        console.error("🔔 WEBHOOK ERROR: Could not find user for checkout session")
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Update the user to pro
      await updateUserToPro(userId, session)
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription
      console.log(`🔔 WEBHOOK: Processing subscription deletion: ${subscription.id}`)

      // Log all metadata for debugging
      console.log("🔔 WEBHOOK: Subscription metadata:", JSON.stringify(subscription.metadata || {}, null, 2))

      // Get the user ID from metadata
      const userId = subscription.metadata?.firebaseUid

      if (!userId) {
        console.error("🔔 WEBHOOK ERROR: No firebaseUid in subscription metadata")

        // Try to find the user by customer ID as fallback
        const customerId = subscription.customer as string
        const usersSnapshot = await db.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get()

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0]
          console.log(`🔔 WEBHOOK: Found user by customer ID: ${userDoc.id}`)
          await downgradeUserToFree(userDoc.id)
          return NextResponse.json({ received: true })
        }

        console.error("🔔 WEBHOOK ERROR: Could not find user for subscription")
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Downgrade the user to free
      await downgradeUserToFree(userId)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("🔔 WEBHOOK ERROR:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  } finally {
    console.log("------------ 🔔 WEBHOOK HANDLER END ------------")
  }
}

/**
 * Updates a user to pro plan
 */
async function updateUserToPro(userId: string, session: Stripe.Checkout.Session) {
  console.log(`🔔 WEBHOOK: Updating user ${userId} to pro plan`)

  try {
    // Get the customer ID from the session
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string

    // Update the user document
    await db
      .collection("users")
      .doc(userId)
      .update({
        plan: "pro",
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionUpdatedAt: new Date(),
        subscriptionStatus: "active",
        hasAccess: true,
        metadata: {
          checkoutSessionId: session.id,
          upgradedAt: new Date().toISOString(),
        },
      })

    console.log(`🔔 WEBHOOK: Successfully updated user ${userId} to pro plan`)

    // Log the event
    await db.collection("subscriptionEvents").add({
      userId,
      eventType: "subscription_created",
      subscriptionId: subscriptionId,
      checkoutSessionId: session.id,
      timestamp: new Date().toISOString(),
      metadata: session.metadata || {},
    })

    // Update the session status in our database
    const sessionDoc = await db.collection("stripeCheckoutSessions").doc(session.id).get()
    if (sessionDoc.exists) {
      await db.collection("stripeCheckoutSessions").doc(session.id).update({
        status: "completed",
        completedAt: new Date(),
        subscriptionId: subscriptionId,
      })
    }
  } catch (error) {
    console.error(`🔔 WEBHOOK ERROR: Failed to update user ${userId} to pro:`, error)
    throw error
  }
}

/**
 * Downgrades a user to free plan
 */
async function downgradeUserToFree(userId: string) {
  console.log(`🔔 WEBHOOK: Downgrading user ${userId} to free plan`)

  try {
    // Update the user document
    await db
      .collection("users")
      .doc(userId)
      .update({
        plan: "free",
        stripeSubscriptionId: null,
        subscriptionUpdatedAt: new Date(),
        subscriptionStatus: "canceled",
        hasAccess: false,
        metadata: {
          downgradedAt: new Date().toISOString(),
        },
      })

    console.log(`🔔 WEBHOOK: Successfully downgraded user ${userId} to free plan`)

    // Log the event
    await db.collection("subscriptionEvents").add({
      userId,
      eventType: "subscription_canceled",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`🔔 WEBHOOK ERROR: Failed to downgrade user ${userId} to free:`, error)
    throw error
  }
}
