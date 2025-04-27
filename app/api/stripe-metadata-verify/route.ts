import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

export async function GET(request: Request) {
  try {
    // Initialize Stripe with the secret key
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Get the most recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 5,
      expand: ["data.subscription"],
    })

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const db = getFirestore()

    // Get the most recent checkout logs
    const logsSnapshot = await db.collection("stripeCheckoutLogs").orderBy("timestamp", "desc").limit(5).get()
    const logs = logsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    return NextResponse.json({
      mode: process.env.STRIPE_SECRET_KEY.startsWith("sk_test") ? "test" : "live",
      sessions: sessions.data.map((session) => ({
        id: session.id,
        created: new Date(session.created * 1000).toISOString(),
        customer_email: session.customer_email,
        metadata: session.metadata,
        subscription:
          typeof session.subscription === "string"
            ? { id: session.subscription }
            : session.subscription
              ? {
                  id: session.subscription.id,
                  metadata: session.subscription.metadata,
                  status: session.subscription.status,
                }
              : null,
      })),
      logs,
    })
  } catch (error) {
    console.error("Error verifying metadata:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
