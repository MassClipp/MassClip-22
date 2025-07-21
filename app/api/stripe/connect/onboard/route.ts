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
    } catch (error) {
      console.error("❌ [Onboard] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Create Stripe Express account
    let stripeAccount
    try {
      stripeAccount = await stripe.accounts.create({
        type: "express",
        email: decodedToken.email,
        metadata: {
          userId: userId,
        },
      })

      console.log("✅ [Onboard] Stripe account created:", stripeAccount.id)
    } catch (stripeError: any) {
      console.error("❌ [Onboard] Stripe account creation failed:", stripeError.message)
      return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 })
    }

    // Create account link for onboarding
    let accountLink
    try {
      accountLink = await stripe.accountLinks.create({
        account: stripeAccount.id,
        refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings`,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/earnings`,
        type: "account_onboarding",
      })

      console.log("✅ [Onboard] Account link created:", accountLink.url)
    } catch (stripeError: any) {
      console.error("❌ [Onboard] Account link creation failed:", stripeError.message)
      return NextResponse.json({ error: "Failed to create onboarding link" }, { status: 500 })
    }

    // Update user document in Firestore
    try {
      await db.collection("users").doc(userId).set(
        {
          stripeAccountId: stripeAccount.id,
          stripeAccountStatus: "pending",
          stripeAccountType: "express",
          updatedAt: new Date(),
        },
        { merge: true },
      )

      console.log("✅ [Onboard] User document updated successfully")
    } catch (firestoreError) {
      console.error("❌ [Onboard] Firestore error:", firestoreError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      accountId: stripeAccount.id,
      url: accountLink.url,
      message: "Onboarding link created successfully",
    })
  } catch (error) {
    console.error("❌ [Onboard] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
