import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function GET() {
  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Missing Stripe secret key" }, { status: 500 })
    }

    // Initialize Stripe with the secret key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Get recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
      expand: ["data.customer", "data.subscription"],
    })

    // Get logs from Firestore
    let logs: any[] = []
    try {
      const { getFirestore } = await import("firebase-admin/firestore")
      const { initializeFirebaseAdmin } = await import("@/lib/firebase-admin")

      initializeFirebaseAdmin()
      const db = getFirestore()

      const logsSnapshot = await db.collection("stripeCheckoutLogs").orderBy("timestamp", "desc").limit(10).get()

      logs = logsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp,
      }))
    } catch (dbError) {
      console.error("Error fetching logs from Firestore:", dbError)
    }

    return NextResponse.json({
      sessions: sessions.data.map((session) => ({
        id: session.id,
        created: session.created,
        customer_email: session.customer_email,
        customer: typeof session.customer === "string" ? session.customer : session.customer?.id,
        status: session.status,
        metadata: session.metadata,
        customer_metadata: typeof session.customer === "string" ? null : session.customer?.metadata,
        subscription_metadata: typeof session.subscription === "string" ? null : session.subscription?.metadata,
      })),
      logs,
    })
  } catch (error) {
    console.error("Error checking Stripe sessions:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
