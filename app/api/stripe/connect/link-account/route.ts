import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 [Link Account] Starting account linking process...")

    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Link Account] No valid authorization header")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    console.log("🔑 [Link Account] Token received, verifying...")

    // Verify the Firebase ID token
    const decodedToken = await verifyIdToken(token)
    if (!decodedToken) {
      console.log("❌ [Link Account] Token verification failed")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("✅ [Link Account] User authenticated:", userId)

    // Get the account ID from request body
    const { accountId } = await request.json()

    if (!accountId) {
      console.log("❌ [Link Account] No account ID provided")
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

    console.log("🔍 [Link Account] Verifying Stripe account:", accountId)

    // Verify the account exists and get its details
    let account
    try {
      account = await stripe.accounts.retrieve(accountId)
      console.log("✅ [Link Account] Stripe account verified:", {
        id: account.id,
        type: account.type,
        country: account.country,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      })
    } catch (stripeError) {
      console.error("❌ [Link Account] Stripe account verification failed:", stripeError)
      return NextResponse.json({ error: "Invalid Stripe account ID" }, { status: 400 })
    }

    // Determine account status
    let accountStatus = "pending"
    if (account.charges_enabled && account.payouts_enabled) {
      accountStatus = "active"
    } else if (account.requirements?.currently_due?.length > 0) {
      accountStatus = "restricted"
    }

    console.log("📊 [Link Account] Account status determined:", accountStatus)

    // Update user document in Firestore
    await db
      .collection("users")
      .doc(userId)
      .update({
        stripeAccountId: accountId,
        stripeAccountStatus: accountStatus,
        stripeAccountDetails: {
          type: account.type,
          country: account.country,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          requirements: account.requirements,
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
  } catch (error) {
    console.error("❌ [Link Account] Error:", error)
    return NextResponse.json({ error: "Failed to link account" }, { status: 500 })
  }
}
