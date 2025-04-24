console.log(">>> Webhook Handler Initialized - App Router Version")
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import * as admin from "firebase-admin"

// Initialize Firebase Admin if it hasn't been initialized yet
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Ensure proper formatting of the private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
    console.log(">>> Firebase Admin initialized successfully")

    // Log private key format (first few characters only, for debugging)
    const privateKeyStart = process.env.FIREBASE_PRIVATE_KEY?.substring(0, 20) || "undefined"
    console.log(`>>> Private key format check: ${privateKeyStart}...`)
    console.log(`>>> Private key contains \\n: ${process.env.FIREBASE_PRIVATE_KEY?.includes("\\n")}`)
    console.log(`>>> Private key contains actual newlines: ${process.env.FIREBASE_PRIVATE_KEY?.includes("\n")}`)
  } catch (error) {
    console.error(">>> Firebase Admin initialization error:", error)
  }
}

// Get Stripe keys from environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Initialize Stripe with the secret key
if (!stripeSecretKey) {
  console.error(">>> STRIPE_SECRET_KEY is not defined in environment variables")
}

const stripe = new Stripe(stripeSecretKey as string, {
  apiVersion: "2023-10-16",
})

/**
 * Stripe Webhook Handler - App Router Version
 * Processes Stripe webhook events, particularly checkout.session.completed
 * Last updated: 2025-04-24
 */
export async function POST(req: NextRequest) {
  console.log(">>> Webhook received")

  try {
    // Get the raw request body
    const text = await req.text()
    const rawBody = Buffer.from(text)
    const signature = req.headers.get("stripe-signature") as string

    // Verify webhook signature
    if (!webhookSecret) {
      console.error(">>> Webhook secret is not defined")
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
      console.log(`>>> Webhook event verified: ${event.type}`)
    } catch (err) {
      console.error(
        `>>> Webhook signature verification failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      )
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      // Log the entire session object for debugging
      console.log(">>> Session object:", JSON.stringify(session, null, 2))

      // Extract userId from metadata
      const userId = session.metadata?.userId

      console.log(`>>> Processing checkout.session.completed event`)
      console.log(`>>> Session metadata:`, session.metadata)
      console.log(`>>> User ID from metadata: ${userId || "NOT FOUND"}`)

      if (!userId) {
        console.error(">>> No userId found in session metadata")
        return NextResponse.json({ error: "Missing userId in session metadata" }, { status: 400 })
      }

      try {
        // Update the user's plan in Firestore
        console.log(`>>> Updating user ${userId} to PRO plan in Firestore`)

        const userRef = admin.firestore().collection("users").doc(userId)

        await userRef.set(
          {
            plan: "pro",
            planActivatedAt: new Date().toISOString(),
          },
          { merge: true },
        )

        console.log(`>>> User ${userId} upgraded to PRO successfully`)
      } catch (error) {
        console.error(
          `>>> Error updating user in Firestore: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
        // We don't want to return an error status here, as Stripe will retry the webhook
        // Instead, log the error and return a 200 to acknowledge receipt
      }
    } else {
      console.log(`>>> Unhandled event type: ${event.type}`)
    }

    // Return success response
    console.log(">>> Webhook processed successfully")
    return NextResponse.json({ received: true, message: "Webhook processed successfully" }, { status: 200 })
  } catch (err) {
    console.error(`>>> Webhook error: ${err instanceof Error ? err.message : "Unknown error"}`)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
