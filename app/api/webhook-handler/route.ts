import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import { getSiteUrl } from "@/lib/url-utils"

// Initialize Firebase Admin
initializeFirebaseAdmin()
const db = getFirestore()

export async function POST(request: Request) {
  console.log("------------ 🔔 WEBHOOK HANDLER START ------------")

  // Check for required environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("🔔 WEBHOOK ERROR: Missing STRIPE_SECRET_KEY")
    return NextResponse.json({ error: "Server configuration error: Missing Stripe secret key" }, { status: 500 })
  }

  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  })

  // Get the webhook secrets
  const primarySecret = process.env.STRIPE_WEBHOOK_SECRET
  const secondarySecret = process.env.STRIPE_WEBHOOK_SECRET_2

  if (!primarySecret && !secondarySecret) {
    console.error("🔔 WEBHOOK ERROR: Missing both STRIPE_WEBHOOK_SECRET and STRIPE_WEBHOOK_SECRET_2")
    return NextResponse.json({ error: "Server configuration error: Missing webhook secret" }, { status: 500 })
  }

  console.log(`🔔 WEBHOOK: Running in environment: ${process.env.NEXT_PUBLIC_VERCEL_ENV || "unknown"}`)
  console.log(`🔔 WEBHOOK: Site URL: ${process.env.NEXT_PUBLIC_SITE_URL || "unknown"}`)
  console.log(`🔔 WEBHOOK: Secondary Site URL: ${process.env.NEXT_PUBLIC_SITE_URL_2 || "none"}`)
  console.log(`🔔 WEBHOOK: Request URL: ${request.url}`)
  console.log(`🔔 WEBHOOK: Host: ${request.headers.get("host")}`)
  console.log(`🔔 WEBHOOK: Primary secret available: ${!!primarySecret}`)
  console.log(`🔔 WEBHOOK: Secondary secret available: ${!!secondarySecret}`)

  const payload = await request.text()
  const sig = request.headers.get("stripe-signature") as string

  console.log(`🔔 WEBHOOK: Received signature: ${sig ? "present" : "missing"}`)

  let event
  let usedSecret = "none"

  try {
    // Try with primary secret first if available
    if (primarySecret) {
      try {
        event = stripe.webhooks.constructEvent(payload, sig, primarySecret)
        usedSecret = "primary"
        console.log(`🔔 WEBHOOK: Successfully verified signature with primary secret`)
      } catch (primaryError: any) {
        console.log(`🔔 WEBHOOK: Primary secret verification failed: ${primaryError.message}`)

        // If primary fails and we have a secondary secret, try that
        if (secondarySecret) {
          try {
            event = stripe.webhooks.constructEvent(payload, sig, secondarySecret)
            usedSecret = "secondary"
            console.log(`🔔 WEBHOOK: Successfully verified signature with secondary secret`)
          } catch (secondaryError: any) {
            console.error(`🔔 WEBHOOK ERROR: Secondary secret verification failed: ${secondaryError.message}`)
            throw primaryError // If both fail, throw the primary error
          }
        } else {
          throw primaryError
        }
      }
    }
    // If no primary secret, try secondary
    else if (secondarySecret) {
      event = stripe.webhooks.constructEvent(payload, sig, secondarySecret)
      usedSecret = "secondary"
      console.log(`🔔 WEBHOOK: Successfully verified signature with secondary secret`)
    }
  } catch (err: any) {
    console.error(`🔔 WEBHOOK ERROR: Signature verification failed: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  console.log(`🔔 WEBHOOK: Received event type: ${event.type}`)
  console.log(`🔔 WEBHOOK: Verified with ${usedSecret} secret`)

  // Handle the event
  try {
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
        const sessionDoc = await db.collection("stripeCheckoutSessions").doc(session.id).get()

        if (sessionDoc.exists) {
          const sessionData = sessionDoc.data()
          const fallbackUserId = sessionData?.userId

          if (fallbackUserId) {
            console.log(`🔔 WEBHOOK: Found userId in Firestore: ${fallbackUserId}`)
            await updateUserToCreatorPro(fallbackUserId, session)
            return NextResponse.json({ received: true })
          }
        }

        console.error("🔔 WEBHOOK ERROR: Could not find user for checkout session")
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Update the user to creator_pro
      await updateUserToCreatorPro(userId, session)
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
 * Updates a user to creator_pro plan
 */
async function updateUserToCreatorPro(userId: string, session: Stripe.Checkout.Session) {
  console.log(`🔔 WEBHOOK: Starting user update for ${userId} with session ${session.id}`)

  try {
    // Get the customer ID from the session
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string
    const siteUrl = getSiteUrl()

    console.log(`🔔 WEBHOOK: Customer ID: ${customerId}, Subscription ID: ${subscriptionId}`)
    console.log(`🔔 WEBHOOK: Current site URL: ${siteUrl}`)

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
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "unknown",
        siteUrl: siteUrl,
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
      siteUrl: siteUrl,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "unknown",
    })

    // Update the session status in our database
    console.log(`🔔 WEBHOOK: Checking if session ${session.id} exists in Firestore`)
    const sessionDoc = await db.collection("stripeCheckoutSessions").doc(session.id).get()
    if (sessionDoc.exists) {
      console.log(`🔔 WEBHOOK: Updating session ${session.id} in Firestore`)
      await db
        .collection("stripeCheckoutSessions")
        .doc(session.id)
        .update({
          status: "completed",
          completedAt: new Date(),
          subscriptionId: subscriptionId,
          siteUrl: siteUrl,
          environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "unknown",
        })
    } else {
      console.log(`🔔 WEBHOOK: Session ${session.id} not found in Firestore, creating new record`)
      await db
        .collection("stripeCheckoutSessions")
        .doc(session.id)
        .set({
          status: "completed",
          completedAt: new Date(),
          subscriptionId: subscriptionId,
          userId: userId,
          siteUrl: siteUrl,
          environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "unknown",
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
async function downgradeUserToFree(userId: string) {
  console.log(`🔔 WEBHOOK: Starting downgrade for user ${userId}`)

  try {
    const siteUrl = getSiteUrl()
    console.log(`🔔 WEBHOOK: Current site URL: ${siteUrl}`)

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
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "unknown",
        siteUrl: siteUrl,
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
      siteUrl: siteUrl,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "unknown",
    })
  } catch (error) {
    console.error(`🔔 WEBHOOK ERROR: Failed to downgrade user ${userId} to free:`, error)
    throw error
  }
}
