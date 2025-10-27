import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get user's Stripe customer ID from membership record
    const membershipDoc = await adminDb.collection("memberships").doc(userId).get()

    if (!membershipDoc.exists) {
      return NextResponse.json({ error: "No active membership found" }, { status: 404 })
    }

    const membershipData = membershipDoc.data()
    const customerId = membershipData?.stripeCustomerId

    if (!customerId) {
      return NextResponse.json({ error: "No Stripe customer ID found" }, { status: 404 })
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/profile?tab=membership`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error("Error creating portal session:", error)
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 })
  }
}
