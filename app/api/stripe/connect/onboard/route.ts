import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🆕 [Onboard] Starting request...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    console.log("🔑 [Onboard] Auth header present:", !!authHeader)

    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ [Onboard] Invalid or missing Bearer token")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Extract token
    const token = authHeader.replace("Bearer ", "")
    console.log("🎫 [Onboard] Token extracted, length:", token.length)

    // Verify Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Onboard] Token verified for user:", decodedToken.uid)
    } catch (error: any) {
      console.error("❌ [Onboard] Token verification failed:", error.message)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    try {
      // Create Stripe Connect account
      console.log("🏗️ [Onboard] Creating Stripe Connect account...")
      const account = await stripe.accounts.create({
        type: "express",
        country: "US", // Default to US, can be made configurable
        email: decodedToken.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })

      console.log("✅ [Onboard] Stripe account created:", account.id)

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings`,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings`,
        type: "account_onboarding",
      })

      console.log("✅ [Onboard] Account link created:", accountLink.url)

      // Update user document in Firestore
      await db.collection("users").doc(userId).set(
        {
          stripeAccountId: account.id,
          stripeAccountStatus: "pending",
          stripeAccountType: account.type,
          stripeAccountCountry: account.country,
          updatedAt: new Date(),
        },
        { merge: true },
      )

      console.log("✅ [Onboard] User document updated successfully")

      return NextResponse.json({
        success: true,
        accountId: account.id,
        url: accountLink.url,
        message: "Onboarding link created successfully",
      })
    } catch (stripeError: any) {
      console.error("❌ [Onboard] Stripe error:", stripeError.message)
      return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("❌ [Onboard] Unexpected error:", error.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
