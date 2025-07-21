import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 [Link Account] Starting request...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    console.log("🔑 [Link Account] Auth header present:", !!authHeader)

    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ [Link Account] Invalid or missing Bearer token")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Extract token
    const token = authHeader.replace("Bearer ", "")
    console.log("🎫 [Link Account] Token extracted, length:", token.length)

    // Verify Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Link Account] Token verified for user:", decodedToken.uid)
    } catch (error: any) {
      console.error("❌ [Link Account] Token verification failed:", error.message)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get request body
    const body = await request.json()
    const { accountId } = body

    if (!accountId) {
      console.log("❌ [Link Account] No account ID provided")
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

    console.log("🔍 [Link Account] Verifying Stripe account:", accountId)

    // Verify the Stripe account exists and get its details
    try {
      const account = await stripe.accounts.retrieve(accountId)
      console.log("✅ [Link Account] Stripe account verified:", {
        id: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      })

      // Update user document in Firestore
      await db
        .collection("users")
        .doc(userId)
        .set(
          {
            stripeAccountId: accountId,
            stripeAccountStatus: account.details_submitted ? "active" : "pending",
            stripeChargesEnabled: account.charges_enabled,
            stripePayoutsEnabled: account.payouts_enabled,
            stripeDetailsSubmitted: account.details_submitted,
            stripeAccountType: account.type,
            stripeCountry: account.country,
            updatedAt: new Date(),
          },
          { merge: true },
        )

      console.log("✅ [Link Account] User document updated successfully")

      return NextResponse.json({
        success: true,
        accountId: accountId,
        status: account.details_submitted ? "active" : "pending",
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      })
    } catch (stripeError: any) {
      console.error("❌ [Link Account] Stripe error:", stripeError.message)
      return NextResponse.json(
        {
          error: "Invalid Stripe account",
          details: stripeError.message,
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Link Account] Unexpected error:", error.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
