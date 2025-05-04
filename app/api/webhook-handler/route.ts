import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import type * as FirebaseFirestore from "@google-cloud/firestore"

// Hardcoded site URL for production
const SITE_URL = "https://massclip.pro"

export async function POST(request: Request) {
  console.log("------------ 🔔 WEBHOOK HANDLER START ------------")
  console.log(`🔔 WEBHOOK: Request URL: ${request.url}`)
  console.log(`🔔 WEBHOOK: Site URL: ${SITE_URL}`)

  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("🔔 WEBHOOK ERROR: Missing STRIPE_SECRET_KEY")
      return NextResponse.json({ error: "Server configuration error: Missing Stripe secret key" }, { status: 500 })
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("🔔 WEBHOOK ERROR: Missing STRIPE_WEBHOOK_SECRET")
      return NextResponse.json({ error: "Server configuration error: Missing webhook secret" }, { status: 500 })
    }

    // Initialize Firebase Admin
    try {
      initializeFirebaseAdmin()
      console.log("🔔 WEBHOOK: Firebase Admin initialized successfully")
    } catch (error) {
      console.error("🔔 WEBHOOK ERROR: Failed to initialize Firebase Admin:", error)
      return NextResponse.json({ error: "Failed to initialize Firebase" }, { status: 500 })
    }

    const db = getFirestore()

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Get the webhook secret
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
    console.log(`🔔 WEBHOOK: Using webhook secret: ${endpointSecret ? "present (hidden)" : "missing"}`)

    // Get the request payload and signature
    let payload
    try {
      payload = await request.text()
      console.log(`🔔 WEBHOOK: Received payload length: ${payload.length} characters`)
    } catch (error) {
      console.error("🔔 WEBHOOK ERROR: Failed to read request payload:", error)
      return NextResponse.json({ error: "Failed to read request payload" }, { status: 400 })
    }

    const sig = request.headers.get("stripe-signature")
    console.log(`🔔 WEBHOOK: Received signature: ${sig ? "present" : "missing"}`)

    if (!sig) {
      console.error("🔔 WEBHOOK ERROR: Missing Stripe signature")
      return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 })
    }

    // Verify the event
    let event
    try {
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret)
      console.log(`🔔 WEBHOOK: Successfully verified signature`)
      console.log(`🔔 WEBHOOK: Received event type: ${event.type}`)
    } catch (err: any) {
      console.error(`🔔 WEBHOOK ERROR: Signature verification failed: ${err.message}`)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      console.log(`🔔 WEBHOOK: Processing checkout session: ${session.id}`)

      // Log all metadata for debugging
      console.log("🔔 WEBHOOK: Session metadata:", JSON.stringify(session.metadata || {}, null, 2))
      console.log("🔔 WEBHOOK: Session customer:", session.customer)
      console.log("🔔 WEBHOOK: Session subscription:", session.subscription)

      // Get the user ID from metadata
      const userId = session.metadata?.firebaseUid

      if (!userId) {
        console.error("🔔 WEBHOOK ERROR: No firebaseUid in session metadata")

        // Try to find the session in our database as fallback
        console.log(`🔔 WEBHOOK: Attempting to find session ${session.id} in Firestore`)
        try {
          const sessionDoc = await db.collection("stripeCheckoutSessions").doc(session.id).get()

          if (sessionDoc.exists) {
            const sessionData = sessionDoc.data()
            const fallbackUserId = sessionData?.userId

            if (fallbackUserId) {
              console.log(`🔔 WEBHOOK: Found userId in Firestore: ${fallbackUserId}`)
              await updateUserToCreatorPro(db, fallbackUserId, session)
              return NextResponse.json({ received: true })
            }
          }
        } catch (error) {
          console.error("🔔 WEBHOOK ERROR: Failed to query Firestore for session:", error)
        }

        console.error("🔔 WEBHOOK ERROR: Could not find user for checkout session")
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Update the user to creator_pro
      await updateUserToCreatorPro(db, userId, session)
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
        console.log(`🔔 WEBHOOK: Attempting to find user with customer ID ${customerId} in Firestore`)

        try {
          const usersSnapshot = await db.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get()

          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0]
            console.log(`🔔 WEBHOOK: Found user by customer ID: ${userDoc.id}`)
            await downgradeUserToFree(db, userDoc.id)
            return NextResponse.json({ received: true })
          }
        } catch (error) {
          console.error("🔔 WEBHOOK ERROR: Failed to query Firestore for user:", error)
        }

        console.error("🔔 WEBHOOK ERROR: Could not find user for subscription")
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Downgrade the user to free
      await downgradeUserToFree(db, userId)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("🔔 WEBHOOK ERROR: Unhandled exception:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  } finally {
    console.log("------------ 🔔 WEBHOOK HANDLER END ------------")
  }
}

/**
 * Updates a user to creator_pro plan
 */
async function updateUserToCreatorPro(
  db: FirebaseFirestore.Firestore,
  userId: string,
  session: Stripe.Checkout.Session,
) {
  console.log(`🔔 WEBHOOK: Starting user update for ${userId} with session ${session.id}`)

  try {
    // Get the customer ID from the session
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string

    console.log(`🔔 WEBHOOK: Customer ID: ${customerId}, Subscription ID: ${subscriptionId}`)
    console.log(`🔔 WEBHOOK: Using site URL: ${SITE_URL}`)

    // Update the user document
    console.log(`🔔 WEBHOOK: Updating Firestore document for user ${userId}`)

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
        siteUrl: SITE_URL,
      },
    }

    console.log(`🔔 WEBHOOK: Update data:`, JSON.stringify(updateData, null, 2))

    await db.collection("users").doc(userId).update(updateData)

    console.log(`🔔 WEBHOOK: Successfully updated user ${userId} to creator_pro plan`)

    // Log the event
    await db.collection("subscriptionEvents").add({
      userId,
      eventType: "subscription_created",
      subscriptionId: subscriptionId,
      checkoutSessionId: session.id,
      timestamp: new Date().toISOString(),
      metadata: session.metadata || {},
      siteUrl: SITE_URL,
    })

    // Update the session status in our database
    console.log(`🔔 WEBHOOK: Checking if session ${session.id} exists in Firestore`)
    const sessionDoc = await db.collection("stripeCheckoutSessions").doc(session.id).get()
    if (sessionDoc.exists) {
      console.log(`🔔 WEBHOOK: Updating session ${session.id} in Firestore`)
      await db.collection("stripeCheckoutSessions").doc(session.id).update({
        status: "completed",
        completedAt: new Date(),
        subscriptionId: subscriptionId,
        siteUrl: SITE_URL,
      })
    } else {
      console.log(`🔔 WEBHOOK: Session ${session.id} not found in Firestore, creating new record`)
      await db.collection("stripeCheckoutSessions").doc(session.id).set({
        status: "completed",
        completedAt: new Date(),
        subscriptionId: subscriptionId,
        userId: userId,
        siteUrl: SITE_URL,
        createdAt: new Date(),
      })
    }
  } catch (error) {
    console.error(`🔔 WEBHOOK ERROR: Failed to update user ${userId} to creator_pro:`, error)
    throw error
  }
}

/**
 * Downgrades a user to free plan
 */
async function downgradeUserToFree(db: FirebaseFirestore.Firestore, userId: string) {
  console.log(`🔔 WEBHOOK: Starting downgrade for user ${userId}`)

  try {
    console.log(`🔔 WEBHOOK: Using site URL: ${SITE_URL}`)

    // Update the user document
    console.log(`🔔 WEBHOOK: Updating Firestore document for user ${userId}`)

    const updateData = {
      plan: "free",
      stripeSubscriptionId: null,
      subscriptionUpdatedAt: new Date(),
      subscriptionStatus: "canceled",
      hasAccess: false,
      metadata: {
        downgradedAt: new Date().toISOString(),
        siteUrl: SITE_URL,
      },
    }

    console.log(`🔔 WEBHOOK: Update data:`, JSON.stringify(updateData, null, 2))

    await db.collection("users").doc(userId).update(updateData)

    console.log(`🔔 WEBHOOK: Successfully downgraded user ${userId} to free plan`)

    // Log the event
    await db.collection("subscriptionEvents").add({
      userId,
      eventType: "subscription_canceled",
      timestamp: new Date().toISOString(),
      siteUrl: SITE_URL,
    })
  } catch (error) {
    console.error(`🔔 WEBHOOK ERROR: Failed to downgrade user ${userId} to free:`, error)
    throw error
  }
}
