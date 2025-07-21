import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [Onboard] Starting Stripe onboarding...")

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
    } catch (error) {
      console.error("❌ [Onboard] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Check if user already has a Stripe account
    try {
      const userDoc = await db.collection("users").doc(userId).get()
      const userData = userDoc.data()

      if (userData?.stripeAccountId) {
        console.log("ℹ️ [Onboard] User already has Stripe account:", userData.stripeAccountId)
        return NextResponse.json(
          {
            error: "User already has a connected Stripe account",
            accountId: userData.stripeAccountId,
          },
          { status: 400 },
        )
      }
    } catch (firestoreError) {
      console.error("⚠️ [Onboard] Error checking existing account:", firestoreError)
      // Continue with onboarding even if we can't check existing account
    }

    // Create Stripe Connect account
    let stripeAccount
    try {
      stripeAccount = await stripe.accounts.create({
        type: "express",
        country: "US", // Default to US, can be made configurable
        email: decodedToken.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })

      console.log("✅ [Onboard] Stripe account created:", stripeAccount.id)
    } catch (stripeError) {
      console.error("❌ [Onboard] Failed to create Stripe account:", stripeError)
      return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 })
    }

    // Create account link for onboarding
    let accountLink
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"

      accountLink = await stripe.accountLinks.create({
        account: stripeAccount.id,
        refresh_url: `${baseUrl}/dashboard/connect-stripe?refresh=true`,
        return_url: `${baseUrl}/dashboard/connect-stripe?success=true`,
        type: "account_onboarding",
      })

      console.log("✅ [Onboard] Account link created")
    } catch (stripeError) {
      console.error("❌ [Onboard] Failed to create account link:", stripeError)
      return NextResponse.json({ error: "Failed to create onboarding link" }, { status: 500 })
    }

    // Save account to user document
    try {
      await db
        .collection("users")
        .doc(userId)
        .update({
          stripeAccountId: stripeAccount.id,
          stripeAccountStatus: "pending",
          stripeAccountDetails: {
            type: stripeAccount.type,
            country: stripeAccount.country,
            charges_enabled: stripeAccount.charges_enabled,
            payouts_enabled: stripeAccount.payouts_enabled,
          },
          updatedAt: new Date(),
        })

      console.log("✅ [Onboard] User document updated with new account")
    } catch (firestoreError) {
      console.error("❌ [Onboard] Failed to save account to user:", firestoreError)
      // Don't fail the request if we can't save to Firestore immediately
    }

    return NextResponse.json({
      success: true,
      accountId: stripeAccount.id,
      onboardingUrl: accountLink.url,
      message: "Stripe account created successfully",
    })
  } catch (error) {
    console.error("❌ [Onboard] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
