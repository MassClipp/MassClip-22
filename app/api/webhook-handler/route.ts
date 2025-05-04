import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import type * as FirebaseFirestore from "@google-cloud/firestore"

// Create a debug log collection to track webhook execution
const DEBUG_MODE = true
const debugLogs: any[] = []

function debugLog(message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    data: data ? JSON.stringify(data) : undefined,
  }

  debugLogs.push(logEntry)
  console.log(`🔍 DEBUG: ${message}`, data !== undefined ? data : "")
}

export async function POST(request: Request) {
  debugLog("Webhook handler started", { url: request.url })

  try {
    // Clone the request to read it multiple times if needed
    const clonedRequest = request.clone()

    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      debugLog("Missing STRIPE_SECRET_KEY")
      return NextResponse.json(
        {
          error: "Server configuration error: Missing Stripe secret key",
          debug: DEBUG_MODE ? debugLogs : undefined,
        },
        { status: 500 },
      )
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      debugLog("Missing STRIPE_WEBHOOK_SECRET")
      return NextResponse.json(
        {
          error: "Server configuration error: Missing webhook secret",
          debug: DEBUG_MODE ? debugLogs : undefined,
        },
        { status: 500 },
      )
    }

    debugLog("Environment variables validated")

    // Get the request payload and signature
    let payload: string
    try {
      payload = await clonedRequest.text()
      debugLog("Request payload received", { length: payload.length })
    } catch (error) {
      debugLog("Failed to read request payload", { error })
      return NextResponse.json(
        {
          error: "Failed to read request payload",
          debug: DEBUG_MODE ? debugLogs : undefined,
        },
        { status: 400 },
      )
    }

    const sig = request.headers.get("stripe-signature")
    debugLog("Stripe signature", { present: !!sig })

    if (!sig) {
      debugLog("Missing Stripe signature")
      return NextResponse.json(
        {
          error: "Missing Stripe signature",
          debug: DEBUG_MODE ? debugLogs : undefined,
        },
        { status: 400 },
      )
    }

    // Initialize Stripe
    let stripe: Stripe
    try {
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2023-10-16",
      })
      debugLog("Stripe initialized")
    } catch (error) {
      debugLog("Failed to initialize Stripe", { error })
      return NextResponse.json(
        {
          error: "Failed to initialize Stripe",
          debug: DEBUG_MODE ? debugLogs : undefined,
        },
        { status: 500 },
      )
    }

    // Verify the event
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET)
      debugLog("Event verified successfully", { type: event.type, id: event.id })
    } catch (err: any) {
      debugLog("Webhook signature verification failed", { error: err.message })

      // Log the first few characters of the secret for debugging
      // Don't log the full secret for security reasons
      const secretPreview = process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 3) + "..."
      debugLog("Webhook secret preview", { preview: secretPreview })

      return NextResponse.json(
        {
          error: `Webhook Error: ${err.message}`,
          debug: DEBUG_MODE ? debugLogs : undefined,
        },
        { status: 400 },
      )
    }

    // Initialize Firebase Admin
    try {
      initializeFirebaseAdmin()
      debugLog("Firebase Admin initialized")
    } catch (error) {
      debugLog("Failed to initialize Firebase Admin", { error })
      return NextResponse.json(
        {
          error: "Failed to initialize Firebase",
          debug: DEBUG_MODE ? debugLogs : undefined,
        },
        { status: 500 },
      )
    }

    const db = getFirestore()
    debugLog("Firestore initialized")

    // Store the raw event for debugging
    try {
      await db
        .collection("stripeWebhookEvents")
        .doc(event.id)
        .set({
          id: event.id,
          type: event.type,
          created: new Date(event.created * 1000),
          receivedAt: new Date(),
          rawEvent: JSON.parse(payload),
          processed: false,
        })
      debugLog("Raw event stored in Firestore", { eventId: event.id })
    } catch (error) {
      debugLog("Failed to store raw event", { error })
      // Continue anyway, as this is just for debugging
    }

    // Handle the event based on type
    if (event.type === "checkout.session.completed") {
      debugLog("Processing checkout.session.completed event")

      const session = event.data.object as Stripe.Checkout.Session
      debugLog("Session details", {
        id: session.id,
        customerId: session.customer,
        subscriptionId: session.subscription,
        hasMetadata: !!session.metadata,
      })

      // Get the user ID from metadata
      const userId = session.metadata?.firebaseUid
      debugLog("User ID from metadata", { userId })

      if (!userId) {
        debugLog("No firebaseUid in session metadata")

        // Try to find the session in our database as fallback
        debugLog("Attempting to find session in Firestore", { sessionId: session.id })

        try {
          const sessionDoc = await db.collection("stripeCheckoutSessions").doc(session.id).get()
          debugLog("Session document lookup result", { exists: sessionDoc.exists })

          if (sessionDoc.exists) {
            const sessionData = sessionDoc.data()
            const fallbackUserId = sessionData?.userId
            debugLog("Session data from Firestore", { userId: fallbackUserId })

            if (fallbackUserId) {
              debugLog("Found userId in Firestore", { userId: fallbackUserId })
              await updateUserToCreatorPro(db, fallbackUserId, session, debugLog)

              // Update the event record to mark it as processed
              await db.collection("stripeWebhookEvents").doc(event.id).update({
                processed: true,
                processedAt: new Date(),
              })

              return NextResponse.json({
                received: true,
                debug: DEBUG_MODE ? debugLogs : undefined,
              })
            }
          }
        } catch (error) {
          debugLog("Failed to query Firestore for session", { error })
        }

        debugLog("Could not find user for checkout session")
        return NextResponse.json(
          {
            error: "User not found",
            debug: DEBUG_MODE ? debugLogs : undefined,
          },
          { status: 404 },
        )
      }

      // Update the user to creator_pro
      try {
        await updateUserToCreatorPro(db, userId, session, debugLog)

        // Update the event record to mark it as processed
        await db.collection("stripeWebhookEvents").doc(event.id).update({
          processed: true,
          processedAt: new Date(),
        })

        debugLog("User updated successfully")
        return NextResponse.json({
          received: true,
          debug: DEBUG_MODE ? debugLogs : undefined,
        })
      } catch (error) {
        debugLog("Failed to update user", { error })
        return NextResponse.json(
          {
            error: "Failed to update user",
            debug: DEBUG_MODE ? debugLogs : undefined,
          },
          { status: 500 },
        )
      }
    } else if (event.type === "customer.subscription.deleted") {
      debugLog("Processing customer.subscription.deleted event")

      const subscription = event.data.object as Stripe.Subscription
      debugLog("Subscription details", {
        id: subscription.id,
        customerId: subscription.customer,
        hasMetadata: !!subscription.metadata,
      })

      // Get the user ID from metadata
      const userId = subscription.metadata?.firebaseUid
      debugLog("User ID from metadata", { userId })

      if (!userId) {
        debugLog("No firebaseUid in subscription metadata")

        // Try to find the user by customer ID as fallback
        const customerId = subscription.customer as string
        debugLog("Attempting to find user with customer ID", { customerId })

        try {
          const usersSnapshot = await db.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get()

          debugLog("User lookup result", { empty: usersSnapshot.empty })

          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0]
            debugLog("Found user by customer ID", { userId: userDoc.id })

            await downgradeUserToFree(db, userDoc.id, debugLog)

            // Update the event record to mark it as processed
            await db.collection("stripeWebhookEvents").doc(event.id).update({
              processed: true,
              processedAt: new Date(),
            })

            return NextResponse.json({
              received: true,
              debug: DEBUG_MODE ? debugLogs : undefined,
            })
          }
        } catch (error) {
          debugLog("Failed to query Firestore for user", { error })
        }

        debugLog("Could not find user for subscription")
        return NextResponse.json(
          {
            error: "User not found",
            debug: DEBUG_MODE ? debugLogs : undefined,
          },
          { status: 404 },
        )
      }

      // Downgrade the user to free
      try {
        await downgradeUserToFree(db, userId, debugLog)

        // Update the event record to mark it as processed
        await db.collection("stripeWebhookEvents").doc(event.id).update({
          processed: true,
          processedAt: new Date(),
        })

        debugLog("User downgraded successfully")
        return NextResponse.json({
          received: true,
          debug: DEBUG_MODE ? debugLogs : undefined,
        })
      } catch (error) {
        debugLog("Failed to downgrade user", { error })
        return NextResponse.json(
          {
            error: "Failed to downgrade user",
            debug: DEBUG_MODE ? debugLogs : undefined,
          },
          { status: 500 },
        )
      }
    } else {
      // For other event types, just acknowledge receipt
      debugLog("Received other event type", { type: event.type })

      // Update the event record to mark it as processed
      await db.collection("stripeWebhookEvents").doc(event.id).update({
        processed: true,
        processedAt: new Date(),
        note: "Event type not handled by webhook",
      })

      return NextResponse.json({
        received: true,
        debug: DEBUG_MODE ? debugLogs : undefined,
      })
    }
  } catch (error: any) {
    debugLog("Unhandled exception in webhook handler", {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      {
        error: "Failed to process webhook",
        message: error.message,
        debug: DEBUG_MODE ? debugLogs : undefined,
      },
      { status: 500 },
    )
  }
}

/**
 * Updates a user to creator_pro plan
 */
async function updateUserToCreatorPro(
  db: FirebaseFirestore.Firestore,
  userId: string,
  session: Stripe.Checkout.Session,
  debugLog: (message: string, data?: any) => void,
) {
  debugLog("Starting user update", { userId, sessionId: session.id })

  // Get the customer ID from the session
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  debugLog("Customer and subscription details", { customerId, subscriptionId })

  // Update the user document
  debugLog("Updating Firestore document for user", { userId })

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
      siteUrl: "https://massclip.pro",
    },
  }

  debugLog("Update data prepared", updateData)

  try {
    await db.collection("users").doc(userId).update(updateData)
    debugLog("User document updated successfully")
  } catch (error) {
    debugLog("Failed to update user document", { error })
    throw error
  }

  // Log the event
  try {
    await db.collection("subscriptionEvents").add({
      userId,
      eventType: "subscription_created",
      subscriptionId: subscriptionId,
      checkoutSessionId: session.id,
      timestamp: new Date().toISOString(),
      metadata: session.metadata || {},
      siteUrl: "https://massclip.pro",
    })
    debugLog("Subscription event logged")
  } catch (error) {
    debugLog("Failed to log subscription event", { error })
    // Continue anyway, as this is not critical
  }

  // Update the session status in our database
  debugLog("Checking if session exists in Firestore", { sessionId: session.id })

  try {
    const sessionDoc = await db.collection("stripeCheckoutSessions").doc(session.id).get()
    debugLog("Session document lookup result", { exists: sessionDoc.exists })

    if (sessionDoc.exists) {
      debugLog("Updating existing session document")
      await db.collection("stripeCheckoutSessions").doc(session.id).update({
        status: "completed",
        completedAt: new Date(),
        subscriptionId: subscriptionId,
        siteUrl: "https://massclip.pro",
      })
    } else {
      debugLog("Creating new session document")
      await db.collection("stripeCheckoutSessions").doc(session.id).set({
        status: "completed",
        completedAt: new Date(),
        subscriptionId: subscriptionId,
        userId: userId,
        siteUrl: "https://massclip.pro",
        createdAt: new Date(),
      })
    }
    debugLog("Session document updated/created successfully")
  } catch (error) {
    debugLog("Failed to update session document", { error })
    // Continue anyway, as this is not critical
  }
}

/**
 * Downgrades a user to free plan
 */
async function downgradeUserToFree(
  db: FirebaseFirestore.Firestore,
  userId: string,
  debugLog: (message: string, data?: any) => void,
) {
  debugLog("Starting user downgrade", { userId })

  // Update the user document
  debugLog("Updating Firestore document for user", { userId })

  const updateData = {
    plan: "free",
    stripeSubscriptionId: null,
    subscriptionUpdatedAt: new Date(),
    subscriptionStatus: "canceled",
    hasAccess: false,
    metadata: {
      downgradedAt: new Date().toISOString(),
      siteUrl: "https://massclip.pro",
    },
  }

  debugLog("Update data prepared", updateData)

  try {
    await db.collection("users").doc(userId).update(updateData)
    debugLog("User document updated successfully")
  } catch (error) {
    debugLog("Failed to update user document", { error })
    throw error
  }

  // Log the event
  try {
    await db.collection("subscriptionEvents").add({
      userId,
      eventType: "subscription_canceled",
      timestamp: new Date().toISOString(),
      siteUrl: "https://massclip.pro",
    })
    debugLog("Subscription event logged")
  } catch (error) {
    debugLog("Failed to log subscription event", { error })
    // Continue anyway, as this is not critical
  }
}
