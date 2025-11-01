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

    // Parse request body
    let body
    try {
      body = await request.json()
      console.log("📝 [Link Account] Request body:", body)
    } catch (error) {
      console.error("❌ [Link Account] Invalid JSON body")
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { stripeAccountId, accountId } = body
    const finalAccountId = stripeAccountId || accountId

    if (!finalAccountId) {
      console.log("❌ [Link Account] No account ID provided")
      return NextResponse.json({ error: "Stripe account ID is required" }, { status: 400 })
    }

    if (!finalAccountId.startsWith("acct_")) {
      console.log("❌ [Link Account] Invalid account ID format")
      return NextResponse.json({ error: "Invalid Stripe account ID format" }, { status: 400 })
    }

    // Verify the Stripe account exists
    try {
      console.log("🔍 [Link Account] Verifying Stripe account:", finalAccountId)
      const account = await stripe.accounts.retrieve(finalAccountId)
      console.log("✅ [Link Account] Stripe account verified:", account.id)

      // Update user document in Firestore
      await db
        .collection("users")
        .doc(userId)
        .set(
          {
            stripeAccountId: finalAccountId,
            stripeAccountStatus: account.details_submitted ? "active" : "pending",
            stripeAccountType: account.type,
            stripeAccountCountry: account.country,
            updatedAt: new Date(),
          },
          { merge: true },
        )

      console.log("✅ [Link Account] User document updated successfully")

      return NextResponse.json({
        success: true,
        accountId: finalAccountId,
        status: account.details_submitted ? "active" : "pending",
        message: "Account linked successfully",
      })
    } catch (stripeError: any) {
      console.error("❌ [Link Account] Stripe error:", stripeError.message)

      if (stripeError.code === "resource_missing") {
        return NextResponse.json({ error: "Stripe account not found" }, { status: 404 })
      }

      return NextResponse.json({ error: "Failed to verify Stripe account" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("❌ [Link Account] Unexpected error:", error.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
