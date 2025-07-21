import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 [Link Account] Starting account linking...")

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
    } catch (error) {
      console.error("❌ [Link Account] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get request body
    let body
    try {
      body = await request.json()
      console.log("📝 [Link Account] Request body received:", { accountId: body.accountId })
    } catch (error) {
      console.error("❌ [Link Account] Invalid request body:", error)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { accountId } = body

    if (!accountId) {
      console.log("❌ [Link Account] No account ID provided")
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

    // Verify Stripe account exists
    let stripeAccount
    try {
      stripeAccount = await stripe.accounts.retrieve(accountId)
      console.log("✅ [Link Account] Stripe account verified:", {
        id: stripeAccount.id,
        type: stripeAccount.type,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
      })
    } catch (stripeError) {
      console.error("❌ [Link Account] Stripe account verification failed:", stripeError)
      return NextResponse.json({ error: "Invalid Stripe account ID" }, { status: 400 })
    }

    // Determine account status
    let accountStatus = "pending"
    if (stripeAccount.charges_enabled && stripeAccount.payouts_enabled) {
      accountStatus = "active"
    } else if (stripeAccount.requirements?.currently_due?.length > 0) {
      accountStatus = "restricted"
    }

    console.log("📊 [Link Account] Account status determined:", accountStatus)

    // Update user document
    try {
      await db
        .collection("users")
        .doc(userId)
        .update({
          stripeAccountId: accountId,
          stripeAccountStatus: accountStatus,
          stripeAccountDetails: {
            type: stripeAccount.type,
            country: stripeAccount.country,
            charges_enabled: stripeAccount.charges_enabled,
            payouts_enabled: stripeAccount.payouts_enabled,
            requirements: stripeAccount.requirements,
          },
          updatedAt: new Date(),
        })

      console.log("✅ [Link Account] User document updated successfully")

      return NextResponse.json({
        success: true,
        accountId,
        status: accountStatus,
        message: "Account linked successfully",
      })
    } catch (firestoreError) {
      console.error("❌ [Link Account] Firestore update failed:", firestoreError)
      return NextResponse.json({ error: "Failed to save account information" }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ [Link Account] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
