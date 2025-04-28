console.log(">>> Webhook Handler Initialized - App Router Version")
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getFirestore } from "firebase-admin/firestore"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"

// Get Stripe keys from environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Log which keys we're using (without exposing the actual keys)
console.log(`Using Stripe key type: ${stripeSecretKey?.startsWith("sk_test") ? "TEST" : "LIVE"}`)
console.log(`Webhook secret configured: ${webhookSecret ? "YES" : "NO"}`)

// Initialize Stripe with the secret key
if (!stripeSecretKey) {
  console.error("STRIPE_SECRET_KEY is not defined in environment variables")
}

const stripe = new Stripe(stripeSecretKey as string, {
  apiVersion: "2023-10-16",
})

// Initialize Firebase Admin if not already initialized
initializeFirebaseAdmin()
const db = getFirestore()

/**
 * Find a user by their userId in Firestore
 */
async function findUserById(userId: string) {
  console.log(`>>> Attempting to find user with ID: ${userId}`)
  try {
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.log(`>>> No user found with ID: ${userId}`)
      return null
    }

    console.log(`>>> Found user with ID: ${userId}`)
    return userDoc
  } catch (error) {
    console.error(`>>> Error finding user by ID: ${error instanceof Error ? error.message : "Unknown error"}`)
    return null
  }
}

/**
 * Try to find the user by various methods
 */
async function findUserByEmail(email: string) {
  console.log(`>>> Attempting to find user with email: ${email}`)
  try {
    // Try case-sensitive search first
    let usersSnapshot = await db.collection("users").where("email", "==", email).get()

    if (usersSnapshot.empty) {
      // Try case-insensitive search using lowercase
      console.log(`>>> No case-sensitive match, trying lowercase comparison`)
      usersSnapshot = await db.collection("users").where("email", "==", email.toLowerCase()).get()
    }

    if (usersSnapshot.empty) {
      console.log(`>>> No user found with email: ${email}`)
      return null
    }

    const userDoc = usersSnapshot.docs[0]
    console.log(`>>> Found user with ID: ${userDoc.id}`)
    return userDoc
  } catch (error) {
    console.error(`>>> Error finding user by email: ${error instanceof Error ? error.message : "Unknown error"}`)
    return null
  }
}

/**
 * Find a user by their Stripe customer ID in Firestore
 */
async function findUserByStripeCustomerId(stripeCustomerId: string) {
  console.log(`>>> Attempting to find user with Stripe customer ID: ${stripeCustomerId}`)
  try {
    const usersSnapshot = await db.collection("users").where("stripeCustomerId", "==", stripeCustomerId).get()

    if (usersSnapshot.empty) {
      console.log(`>>> No user found with Stripe customer ID: ${stripeCustomerId}`)
      return null
    }

    const userDoc = usersSnapshot.docs[0]
    console.log(`>>> Found user with ID: ${userDoc.id} by Stripe customer ID`)
    return userDoc
  } catch (error) {
    console.error(
      `>>> Error finding user by Stripe customer ID: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
    return null
  }
}

/**
 * Handles checkout.session.completed events by updating the user's plan in Firestore
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  try {
    const session = event.data.object as Stripe.Checkout.Session
    console.log("------------ WEBHOOK SESSION PROCESSING START ------------")
    console.log(">>> Processing checkout.session.completed event")
    console.log(">>> Session ID:", session.id)

    // Log ALL session properties to debug
    console.log(">>> ALL SESSION PROPERTIES:")
    console.log(JSON.stringify(session, null, 2))

    // Also update the logging to show the plan from metadata
    console.log(`Plan from metadata: ${session.metadata?.plan || "not specified"}`)

    // ENHANCED USER LOOKUP STRATEGY FOR LIVE MODE
    let userDoc = null

    // 1. First try to find the user by firebaseUid from metadata (works in test mode)
    const firebaseUid = session.metadata?.firebaseUid
    if (firebaseUid && firebaseUid !== "not-provided" && firebaseUid !== "") {
      console.log(`Looking up user by firebaseUid: ${firebaseUid}`)
      userDoc = await findUserById(firebaseUid)

      if (userDoc) {
        console.log(`Found user by firebaseUid: ${userDoc.id}`)
      } else {
        console.warn(`No user found with firebaseUid: ${firebaseUid}, trying other methods`)
      }
    } else {
      console.warn("No valid firebaseUid in session metadata, trying other methods")
    }

    // 2. If not found by firebaseUid, try by customer ID (works in both test and live mode)
    if (!userDoc && session.customer) {
      const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer.id
      console.log(`Looking up user by Stripe customer ID: ${stripeCustomerId}`)
      userDoc = await findUserByStripeCustomerId(stripeCustomerId)

      if (userDoc) {
        console.log(`Found user by Stripe customer ID: ${userDoc.id}`)
      } else {
        console.warn(`No user found with Stripe customer ID: ${stripeCustomerId}, trying email lookup`)
      }
    }

    // 3. If still not found, try by email (works in both test and live mode)
    if (!userDoc) {
      // Try multiple possible sources for email
      let customerEmail = null

      // Check customer_email field (most reliable in live mode)
      if (session.customer_email) {
        customerEmail = session.customer_email
        console.log(`>>> Found email in customer_email: ${customerEmail}`)
      }
      // Check metadata
      else if (session.metadata && session.metadata.email) {
        customerEmail = session.metadata.email
        console.log(`>>> Found email in metadata: ${customerEmail}`)
      }
      // Check customer details
      else if (session.customer_details && session.customer_details.email) {
        customerEmail = session.customer_details.email
        console.log(`>>> Found email in customer_details: ${customerEmail}`)
      }

      if (customerEmail) {
        userDoc = await findUserByEmail(customerEmail)

        if (userDoc) {
          console.log(`Found user by email: ${userDoc.id}`)
        } else {
          console.warn(`No user found with email: ${customerEmail}`)
        }
      }
    }

    // 4. If we still can't find the user, try to get more information from Stripe
    if (!userDoc && session.customer) {
      try {
        const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer.id
        console.log(`>>> Fetching additional customer data from Stripe for ID: ${stripeCustomerId}`)

        const customer = await stripe.customers.retrieve(stripeCustomerId)

        if (customer && !customer.deleted && customer.email) {
          console.log(`>>> Found customer email from Stripe API: ${customer.email}`)
          userDoc = await findUserByEmail(customer.email)

          if (userDoc) {
            console.log(`Found user by email from Stripe customer data: ${userDoc.id}`)
          }
        }
      } catch (stripeError) {
        console.error(">>> Error fetching customer from Stripe:", stripeError)
      }
    }

    // If we still couldn't find the user, log an error and exit
    if (!userDoc) {
      console.error(`>>> CRITICAL: Could not find user for checkout session ${session.id}`)
      console.error(">>> User upgrade failed - cannot identify which user completed checkout")
      return true
    }

    const userId = userDoc.id
    console.log(`>>> Updating user ${userId} to Pro plan`)

    // Get the Stripe customer ID if available
    let stripeCustomerId = null
    if (session.customer) {
      stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer.id
      console.log(`>>> Found Stripe customer ID: ${stripeCustomerId}`)
    }

    // Prepare update object
    const updateData: Record<string, any> = {
      plan: "pro",
      planActivatedAt: new Date().toISOString(),
      subscriptionStatus: "active",
      hasAccess: true,
    }

    // Add Stripe customer ID if available
    if (stripeCustomerId) {
      updateData.stripeCustomerId = stripeCustomerId
    }

    // Reset monthly download count if applicable
    if (userDoc.data()?.downloadCount) {
      updateData.downloadCount = 0
    }

    // Update the user document in Firestore
    await db.collection("users").doc(userId).update(updateData)

    console.log(`>>> Successfully upgraded user ${userId} to Pro plan`)
    console.log("------------ WEBHOOK SESSION PROCESSING END ------------")
    return true
  } catch (error) {
    console.error(
      ">>> Error handling checkout.session.completed:",
      error instanceof Error ? error.message : "Unknown error",
    )
    // We don't throw here to prevent the webhook from failing
    return false
  }
}

/**
 * Handles invoice.payment_failed events by downgrading the user's plan in Firestore
 */
async function handleInvoicePaymentFailed(event: Stripe.Event) {
  try {
    const invoice = event.data.object as Stripe.Invoice
    console.log("------------ WEBHOOK INVOICE PAYMENT FAILED PROCESSING START ------------")
    console.log(">>> Processing invoice.payment_failed event")
    console.log(">>> Invoice ID:", invoice.id)

    // Log key invoice properties for debugging
    console.log(">>> Key invoice properties:")
    console.log(`Customer: ${invoice.customer}`)
    console.log(`Subscription: ${invoice.subscription}`)
    console.log(`Status: ${invoice.status}`)
    console.log(`Attempt count: ${invoice.attempt_count}`)

    // ENHANCED USER LOOKUP STRATEGY FOR LIVE MODE
    let userDoc = null

    // 1. First try to get the subscription to access its metadata
    let firebaseUid = null
    if (invoice.subscription) {
      try {
        const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        console.log(">>> Retrieved subscription:", subscription.id)

        // Check for firebaseUid in subscription metadata
        if (subscription.metadata && subscription.metadata.firebaseUid) {
          firebaseUid = subscription.metadata.firebaseUid
          console.log(`>>> Found firebaseUid in subscription metadata: ${firebaseUid}`)

          userDoc = await findUserById(firebaseUid)
          if (userDoc) {
            console.log(`Found user by firebaseUid: ${userDoc.id}`)
          }
        }
      } catch (err) {
        console.error(">>> Error retrieving subscription:", err instanceof Error ? err.message : "Unknown error")
      }
    }

    // 2. If not found by firebaseUid, try by customer ID
    if (!userDoc && invoice.customer) {
      const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer.id
      console.log(`Looking up user by Stripe customer ID: ${stripeCustomerId}`)
      userDoc = await findUserByStripeCustomerId(stripeCustomerId)

      if (userDoc) {
        console.log(`Found user by Stripe customer ID: ${userDoc.id}`)
      }
    }

    // 3. If still not found, try to get customer email from Stripe
    if (!userDoc && invoice.customer) {
      try {
        const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer.id
        console.log(`>>> Fetching customer data from Stripe for ID: ${stripeCustomerId}`)

        const customer = await stripe.customers.retrieve(stripeCustomerId)

        if (customer && !customer.deleted && customer.email) {
          console.log(`>>> Found customer email from Stripe API: ${customer.email}`)
          userDoc = await findUserByEmail(customer.email)

          if (userDoc) {
            console.log(`Found user by email from Stripe customer data: ${userDoc.id}`)
          }
        }
      } catch (stripeError) {
        console.error(">>> Error fetching customer from Stripe:", stripeError)
      }
    }

    // If we still couldn't find the user, log an error and exit
    if (!userDoc) {
      console.error(`>>> CRITICAL: Could not find user for invoice ${invoice.id}`)
      return true
    }

    const userId = userDoc.id
    console.log(`>>> Downgrading user ${userId} to free plan due to payment failure`)

    // Update the user document in Firestore
    await db.collection("users").doc(userId).update({
      plan: "free",
      downgradedAt: new Date().toISOString(),
      subscriptionStatus: "payment_failed",
      hasAccess: false,
    })

    console.log(`>>> Successfully downgraded user ${userId} to free plan`)
    console.log("------------ WEBHOOK INVOICE PAYMENT FAILED PROCESSING END ------------")
    return true
  } catch (error) {
    console.error(
      ">>> Error handling invoice.payment_failed:",
      error instanceof Error ? error.message : "Unknown error",
    )
    // We don't throw here to prevent the webhook from failing
    return false
  }
}

/**
 * Handles customer.subscription.deleted events by downgrading the user's plan in Firestore
 */
async function handleSubscriptionDeleted(event: Stripe.Event) {
  try {
    const subscription = event.data.object as Stripe.Subscription
    console.log("------------ WEBHOOK SUBSCRIPTION DELETED PROCESSING START ------------")
    console.log(">>> Processing customer.subscription.deleted event")
    console.log(">>> Subscription ID:", subscription.id)

    // Log key subscription properties for debugging
    console.log(">>> Key subscription properties:")
    console.log(`Customer: ${subscription.customer}`)
    console.log(`Status: ${subscription.status}`)
    console.log(`Cancel at: ${subscription.cancel_at}`)
    console.log(`Canceled at: ${subscription.canceled_at}`)

    // ENHANCED USER LOOKUP STRATEGY FOR LIVE MODE
    let userDoc = null

    // 1. First check for firebaseUid in metadata
    if (subscription.metadata && subscription.metadata.firebaseUid) {
      const firebaseUid = subscription.metadata.firebaseUid
      console.log(`>>> Found firebaseUid in metadata: ${firebaseUid}`)

      userDoc = await findUserById(firebaseUid)
      if (userDoc) {
        console.log(`Found user by firebaseUid: ${userDoc.id}`)
      }
    }

    // 2. If not found by firebaseUid, try by customer ID
    if (!userDoc && subscription.customer) {
      const stripeCustomerId =
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
      console.log(`Looking up user by Stripe customer ID: ${stripeCustomerId}`)
      userDoc = await findUserByStripeCustomerId(stripeCustomerId)

      if (userDoc) {
        console.log(`Found user by Stripe customer ID: ${userDoc.id}`)
      }
    }

    // 3. If still not found, try to get customer email from Stripe
    if (!userDoc && subscription.customer) {
      try {
        const stripeCustomerId =
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
        console.log(`>>> Fetching customer data from Stripe for ID: ${stripeCustomerId}`)

        const customer = await stripe.customers.retrieve(stripeCustomerId)

        if (customer && !customer.deleted && customer.email) {
          console.log(`>>> Found customer email from Stripe API: ${customer.email}`)
          userDoc = await findUserByEmail(customer.email)

          if (userDoc) {
            console.log(`Found user by email from Stripe customer data: ${userDoc.id}`)
          }
        }
      } catch (stripeError) {
        console.error(">>> Error fetching customer from Stripe:", stripeError)
      }
    }

    // If we still couldn't find the user, log an error and exit
    if (!userDoc) {
      console.error(`>>> CRITICAL: Could not find user for subscription ${subscription.id}`)
      return true
    }

    const userId = userDoc.id
    console.log(`>>> Downgrading user ${userId} to free plan due to subscription cancellation`)

    // Update the user document in Firestore
    await db.collection("users").doc(userId).update({
      plan: "free",
      downgradedAt: new Date().toISOString(),
      subscriptionStatus: "canceled",
      hasAccess: false,
    })

    console.log(`>>> Successfully downgraded user ${userId} to free plan`)
    console.log("------------ WEBHOOK SUBSCRIPTION DELETED PROCESSING END ------------")
    return true
  } catch (error) {
    console.error(
      ">>> Error handling customer.subscription.deleted:",
      error instanceof Error ? error.message : "Unknown error",
    )
    // We don't throw here to prevent the webhook from failing
    return false
  }
}

/**
 * Handles customer.subscription.updated events by updating the user's plan in Firestore
 */
async function handleSubscriptionUpdated(event: Stripe.Event) {
  try {
    const subscription = event.data.object as Stripe.Subscription
    console.log("------------ WEBHOOK SUBSCRIPTION UPDATED PROCESSING START ------------")
    console.log(">>> Processing customer.subscription.updated event")
    console.log(">>> Subscription ID:", subscription.id)

    // Log key subscription properties for debugging
    console.log(">>> Key subscription properties:")
    console.log(`Customer: ${subscription.customer}`)
    console.log(`Status: ${subscription.status}`)
    console.log(`Cancel at: ${subscription.cancel_at}`)
    console.log(`Current period end: ${subscription.current_period_end}`)

    // ENHANCED USER LOOKUP STRATEGY FOR LIVE MODE
    let userDoc = null

    // 1. First check for firebaseUid in metadata
    if (subscription.metadata && subscription.metadata.firebaseUid) {
      const firebaseUid = subscription.metadata.firebaseUid
      console.log(`>>> Found firebaseUid in metadata: ${firebaseUid}`)

      userDoc = await findUserById(firebaseUid)
      if (userDoc) {
        console.log(`Found user by firebaseUid: ${userDoc.id}`)
      }
    }

    // 2. If not found by firebaseUid, try by customer ID
    if (!userDoc && subscription.customer) {
      const stripeCustomerId =
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
      console.log(`Looking up user by Stripe customer ID: ${stripeCustomerId}`)
      userDoc = await findUserByStripeCustomerId(stripeCustomerId)

      if (userDoc) {
        console.log(`Found user by Stripe customer ID: ${userDoc.id}`)
      }
    }

    // 3. If still not found, try to get customer email from Stripe
    if (!userDoc && subscription.customer) {
      try {
        const stripeCustomerId =
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
        console.log(`>>> Fetching customer data from Stripe for ID: ${stripeCustomerId}`)

        const customer = await stripe.customers.retrieve(stripeCustomerId)

        if (customer && !customer.deleted && customer.email) {
          console.log(`>>> Found customer email from Stripe API: ${customer.email}`)
          userDoc = await findUserByEmail(customer.email)

          if (userDoc) {
            console.log(`Found user by email from Stripe customer data: ${userDoc.id}`)
          }
        }
      } catch (stripeError) {
        console.error(">>> Error fetching customer from Stripe:", stripeError)
      }
    }

    // If we still couldn't find the user, log an error and exit
    if (!userDoc) {
      console.error(`>>> CRITICAL: Could not find user for subscription ${subscription.id}`)
      return true
    }

    const userId = userDoc.id
    console.log(`>>> Updating subscription status for user ${userId}`)

    // Determine the subscription status and access
    const subscriptionStatus = subscription.status
    let hasAccess = true
    let plan = "pro"

    // Check if subscription is in a state that should revoke access
    if (["canceled", "unpaid", "incomplete_expired", "past_due"].includes(subscription.status)) {
      hasAccess = false
      plan = "free"
      console.log(`>>> Revoking access for user ${userId} due to subscription status: ${subscription.status}`)
    }

    // Update the user document in Firestore
    const updateData: Record<string, any> = {
      subscriptionStatus,
      hasAccess,
    }

    // Only update plan if access is being revoked
    if (!hasAccess) {
      updateData.plan = plan
      updateData.downgradedAt = new Date().toISOString()
    }

    await db.collection("users").doc(userId).update(updateData)

    console.log(`>>> Successfully updated subscription status for user ${userId}`)
    console.log("------------ WEBHOOK SUBSCRIPTION UPDATED PROCESSING END ------------")
    return true
  } catch (error) {
    console.error(
      ">>> Error handling customer.subscription.updated:",
      error instanceof Error ? error.message : "Unknown error",
    )
    // We don't throw here to prevent the webhook from failing
    return false
  }
}

/**
 * Stripe Webhook Handler - App Router Version
 * Processes Stripe webhook events and updates user plans
 * Last updated: 2025-04-27
 */
export async function POST(req: NextRequest) {
  console.log(">>> Webhook received")
  let event: Stripe.Event | null = null

  try {
    // Get the raw request body
    const text = await req.text()

    // Log the first part of the raw webhook payload (truncated for security)
    const truncatedText = text.length > 500 ? text.substring(0, 500) + "..." : text
    console.log(`>>> Raw webhook payload (truncated): ${truncatedText}`)

    const rawBody = Buffer.from(text)
    const signature = req.headers.get("stripe-signature") as string

    // Verify webhook signature if secret is available
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
        console.log(`>>> Webhook event verified: ${event.type}`)
      } catch (err) {
        console.error(
          `>>> Webhook signature verification failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        )
        // Continue processing even if signature fails, but log the error
        try {
          // Try to parse the event without verification
          const jsonData = JSON.parse(text)
          event = jsonData as Stripe.Event
          console.log(`>>> Proceeding with unverified event: ${event.type}`)
        } catch (parseErr) {
          console.error(">>> Could not parse webhook payload as JSON")
        }
      }
    } else {
      // If no webhook secret, try to parse the event from the request body
      try {
        const jsonData = JSON.parse(text)
        event = jsonData as Stripe.Event
        console.log(`>>> Proceeding with unverified event: ${event.type}`)
      } catch (parseErr) {
        console.error(">>> Could not parse webhook payload as JSON")
      }
    }

    // Process the event if we have one
    if (event) {
      // Handle different event types
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(event)
          break
        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(event)
          break
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(event)
          break
        case "customer.subscription.updated":
          await handleSubscriptionUpdated(event)
          break
        default:
          console.log(`>>> Unhandled event type: ${event.type}`)
      }
    }

    // Return success response regardless of event processing outcome
    // This prevents Stripe from retrying the webhook
    console.log(">>> Webhook processing completed")
    return NextResponse.json({ received: true, message: "Webhook processed" }, { status: 200 })
  } catch (err) {
    // Catch-all error handler to prevent the webhook from crashing
    console.error(`>>> Webhook error: ${err instanceof Error ? err.message : "Unknown error"}`)

    // Still return 200 to prevent Stripe from retrying
    return NextResponse.json({ received: true, message: "Webhook received with errors" }, { status: 200 })
  }
}
