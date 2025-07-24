import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest, adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    // Get user from authorization header or return public status
    let userId: string | null = null

    try {
      const authHeader = request.headers.get("authorization")
      if (authHeader?.startsWith("Bearer ")) {
        const idToken = authHeader.substring(7)
        const { auth } = await import("@/lib/firebase-admin")
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
      }
    } catch (error) {
      // If no valid auth, return default status
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "not_authenticated",
      })
    }

    if (!userId) {
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "not_authenticated",
      })
    }

    // Get user profile
    const userDoc = await adminDb.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "user_not_found",
      })
    }

    const userData = userDoc.data()!
    const stripeAccountId = userData.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "not_connected",
      })
    }

    try {
      // Get fresh account data from Stripe
      const account = await stripe.accounts.retrieve(stripeAccountId)

      // Update local cache
      await adminDb.collection("users").doc(userId).update({
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeDetailsSubmitted: account.details_submitted,
        stripeEmail: account.email,
        updatedAt: new Date(),
      })

      return NextResponse.json({
        connected: true,
        accountId: stripeAccountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        email: account.email,
        status: account.charges_enabled && account.payouts_enabled ? "active" : "pending",
      })
    } catch (stripeError: any) {
      console.error("Error fetching Stripe account:", stripeError)

      // Return cached data if Stripe API fails
      return NextResponse.json({
        connected: true,
        accountId: stripeAccountId,
        chargesEnabled: userData.stripeChargesEnabled || false,
        payoutsEnabled: userData.stripePayoutsEnabled || false,
        detailsSubmitted: userData.stripeDetailsSubmitted || false,
        email: userData.stripeEmail,
        status: "error_fetching_status",
      })
    }
  } catch (error: any) {
    console.error("Error checking Stripe status:", error)
    return NextResponse.json({ error: "Failed to check Stripe status", details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await getUserFromRequest(request)

    // Get user profile
    const userDoc = await adminDb.collection("users").doc(uid).get()

    if (!userDoc.exists) {
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "user_not_found",
      })
    }

    const userData = userDoc.data()!
    const stripeAccountId = userData.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "not_connected",
      })
    }

    try {
      // Get fresh account data from Stripe
      const account = await stripe.accounts.retrieve(stripeAccountId)

      // Update local cache
      await adminDb.collection("users").doc(uid).update({
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeDetailsSubmitted: account.details_submitted,
        stripeEmail: account.email,
        updatedAt: new Date(),
      })

      return NextResponse.json({
        connected: true,
        accountId: stripeAccountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        email: account.email,
        status: account.charges_enabled && account.payouts_enabled ? "active" : "pending",
      })
    } catch (stripeError: any) {
      console.error("Error fetching Stripe account:", stripeError)

      // Return cached data if Stripe API fails
      return NextResponse.json({
        connected: true,
        accountId: stripeAccountId,
        chargesEnabled: userData.stripeChargesEnabled || false,
        payoutsEnabled: userData.stripePayoutsEnabled || false,
        detailsSubmitted: userData.stripeDetailsSubmitted || false,
        email: userData.stripeEmail,
        status: "error_fetching_status",
      })
    }
  } catch (error: any) {
    console.error("Error checking Stripe status:", error)
    return NextResponse.json({ error: "Failed to check Stripe status", details: error.message }, { status: 500 })
  }
}
