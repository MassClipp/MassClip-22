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
    } catch (error) {
      console.error("❌ [Link Account] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get request body
    const body = await request.json()
    const { accountId } = body

    if (!accountId || typeof accountId !== "string") {
      console.log("❌ [Link Account] Invalid account ID")
      return NextResponse.json({ error: "Valid account ID is required" }, { status: 400 })
    }

    console.log("🔍 [Link Account] Verifying Stripe account:", accountId)

    // Verify the Stripe account exists and get its details
    let stripeAccount
    try {
      stripeAccount = await stripe.accounts.retrieve(accountId)
      console.log("✅ [Link Account] Stripe account verified:", {
        id: stripeAccount.id,
        type: stripeAccount.type,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
      })
    } catch (stripeError: any) {
      console.error("❌ [Link Account] Stripe account verification failed:", stripeError.message)
      return NextResponse.json({ error: "Invalid Stripe account ID" }, { status: 400 })
    }

    // Update user document in Firestore
    try {
      await db
        .collection("users")
        .doc(userId)
        .set(
          {
            stripeAccountId: accountId,
            stripeAccountStatus: stripeAccount.charges_enabled && stripeAccount.payouts_enabled ? "active" : "pending",
            stripeAccountType: stripeAccount.type,
            updatedAt: new Date(),
          },
          { merge: true },
        )

      console.log("✅ [Link Account] User document updated successfully")

      return NextResponse.json({
        success: true,
        accountId: accountId,
        status: stripeAccount.charges_enabled && stripeAccount.payouts_enabled ? "active" : "pending",
        message: "Account linked successfully",
      })
    } catch (firestoreError) {
      console.error("❌ [Link Account] Firestore error:", firestoreError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ [Link Account] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
