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
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "No valid Bearer token found in Authorization header",
        },
        { status: 401 },
      )
    }

    // Extract token
    const token = authHeader.replace("Bearer ", "")
    console.log("🎫 [Link Account] Token extracted, length:", token.length)

    // Verify Firebase token
    let decodedToken
    try {
      console.log("🔍 [Link Account] Verifying token...")
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Link Account] Token verified for user:", decodedToken.uid)
    } catch (error: any) {
      console.error("❌ [Link Account] Token verification failed:", error.message)
      console.error("❌ [Link Account] Error code:", error.code)
      return NextResponse.json(
        {
          error: "Invalid authentication token",
          details: {
            message: error.message,
            code: error.code,
          },
        },
        { status: 401 },
      )
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
      console.log("❌ [Link Account] Invalid account ID format:", finalAccountId)
      return NextResponse.json(
        {
          error: "Invalid Stripe account ID format",
          details: "Account ID must start with 'acct_'",
        },
        { status: 400 },
      )
    }

    // Check if we're in test mode
    const isTestMode = process.env.STRIPE_SECRET_KEY?.includes("sk_test_")
    console.log("🧪 [Link Account] Stripe mode:", isTestMode ? "TEST" : "LIVE")

    // Verify the Stripe account exists
    try {
      console.log("🔍 [Link Account] Verifying Stripe account:", finalAccountId)
      const account = await stripe.accounts.retrieve(finalAccountId)
      console.log("✅ [Link Account] Stripe account verified:", {
        id: account.id,
        type: account.type,
        country: account.country,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      })

      // Update user document in Firestore
      const userData = {
        stripeAccountId: finalAccountId,
        stripeAccountStatus: account.details_submitted ? "active" : "pending",
        stripeAccountType: account.type,
        stripeAccountCountry: account.country,
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeDetailsSubmitted: account.details_submitted,
        updatedAt: new Date(),
      }

      await db.collection("users").doc(userId).set(userData, { merge: true })

      console.log("✅ [Link Account] User document updated successfully")

      return NextResponse.json({
        success: true,
        accountId: finalAccountId,
        status: account.details_submitted ? "active" : "pending",
        message: "Account linked successfully",
        accountDetails: {
          type: account.type,
          country: account.country,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        },
      })
    } catch (stripeError: any) {
      console.error("❌ [Link Account] Stripe error:", stripeError.message)
      console.error("❌ [Link Account] Stripe error code:", stripeError.code)
      console.error("❌ [Link Account] Stripe error type:", stripeError.type)

      if (stripeError.code === "resource_missing") {
        return NextResponse.json(
          {
            error: "Stripe account not found",
            details: `The account ID '${finalAccountId}' does not exist or is not accessible with your current Stripe keys.`,
            suggestions: [
              "Double-check the account ID format (should start with 'acct_')",
              "Ensure you're using the correct Stripe environment (test vs live)",
              "Verify the account exists in your Stripe dashboard",
            ],
          },
          { status: 404 },
        )
      }

      if (stripeError.code === "account_invalid") {
        return NextResponse.json(
          {
            error: "Invalid Stripe account",
            details: "The provided account ID is not valid or accessible",
            suggestions: ["Check that the account ID is correct", "Ensure the account belongs to your Stripe platform"],
          },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          error: "Failed to verify Stripe account",
          details: stripeError.message,
          code: stripeError.code,
          type: stripeError.type,
          suggestions: [
            "Verify the account ID is correct",
            "Check your Stripe API keys are properly configured",
            "Ensure you have access to this account",
          ],
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Link Account] Unexpected error:", error.message)
    console.error("❌ [Link Account] Error stack:", error.stack)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
