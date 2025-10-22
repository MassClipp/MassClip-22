import { type NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get user's Stripe customer ID from membership
    const { adminDb } = await import("@/lib/firebase-admin")
    const membershipDoc = await adminDb.collection("memberships").doc(userId).get()

    if (!membershipDoc.exists) {
      return NextResponse.json({ events: [] })
    }

    const membershipData = membershipDoc.data()
    const customerId = membershipData?.stripeCustomerId

    if (!customerId) {
      return NextResponse.json({ events: [] })
    }

    // Fetch recent events for this customer
    const events = await stripe.events.list({
      limit: 10,
      type: "customer.subscription.*",
    })

    // Filter events for this specific customer
    const customerEvents = events.data.filter((event: any) => {
      const subscription = event.data.object as Stripe.Subscription
      return subscription.customer === customerId
    })

    return NextResponse.json({
      events: customerEvents.map((event) => ({
        id: event.id,
        type: event.type,
        created: event.created,
        data: event.data.object,
      })),
    })
  } catch (error) {
    console.error("[v0] Error fetching webhook events:", error)
    return NextResponse.json({ error: "Failed to fetch webhook events" }, { status: 500 })
  }
}
