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

    // First try to get userId from metadata
    let userDoc = null
    if (session.metadata && session.metadata.userId && session.metadata.userId !== "not-provided") {
      const userId = session.metadata.userId
      console.log(`>>> Found userId in metadata: ${userId}`)
      userDoc = await findUserById(userId)
    }

    // If no user found by userId, fall back to email lookup
    if (!userDoc) {
      console.log(">>> No user found by userId or userId not provided, falling back to email lookup")

      // Try multiple possible sources for email
      let customerEmail = null

      // Check metadata
      if (session.metadata && session.metadata.email) {
        customerEmail = session.metadata.email
        console.log(`>>> Found email in metadata: ${customerEmail}`)
      }
      // Check customer_email field
      else if (session.customer_email) {
        customerEmail = session.customer_email
        console.log(`>>> Found email in customer_email: ${customerEmail}`)
      }
      // Check customer details
      else if (session.customer_details && session.customer_details.email) {
        customerEmail = session.customer_details.email
        console.log(`>>> Found email in customer_details: ${customerEmail}`)
      }

      if (!customerEmail) {
        console.error(">>> CRITICAL: No email or userId found in session!")
        console.error(">>> User upgrade failed - cannot identify which user completed checkout")
        return true
      }

      // Find the user by email in Firestore
      userDoc = await findUserByEmail(customerEmail)
    }

    if (!userDoc) {
      console.error(`>>> CRITICAL: Could not find user by userId or email in session`)
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
 * Stripe Webhook Handler - App Router Version
 * Processes Stripe webhook events and updates user plans
 * Last updated: 2025-04-24
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

        // Add other event types as needed
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
