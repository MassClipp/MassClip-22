import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [Stripe] Creating new Express account...")

    // Verify user authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ [Stripe] No authorization header provided")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Stripe] Invalid ID token:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🔧 [Stripe] Creating account for user: ${userId}`)

    // Get base URL from environment
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro"
    console.log(`🔧 [Stripe] Using base URL: ${baseUrl}`)

    // Create Stripe Express account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US", // Default to US, can be made dynamic later
      email: decodedToken.email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual", // Default to individual, will be updated during onboarding
      metadata: {
        userId: userId,
        platform: "massclip",
        created_at: new Date().toISOString(),
      },
    })

    console.log(`✅ [Stripe] Created Express account: ${account.id}`)

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/dashboard/earnings?refresh=true`,
      return_url: `${baseUrl}/dashboard/earnings?success=true`,
      type: "account_onboarding",
    })

    console.log(`✅ [Stripe] Created account link: ${accountLink.url}`)

    // Save account info to Firestore
    try {
      await adminDb.collection("users").doc(userId).update({
        stripeAccountId: account.id,
        stripeAccountStatus: "pending",
        stripeAccountType: "individual",
        stripeOnboardingStarted: new Date(),
        updatedAt: new Date(),
      })
      console.log(`✅ [Stripe] Saved account info to Firestore for user: ${userId}`)
    } catch (firestoreError) {
      console.error("⚠️ [Stripe] Failed to save to Firestore:", firestoreError)
      // Don't fail the request if Firestore update fails
    }

    return NextResponse.json({
      url: accountLink.url,
      accountId: account.id,
      success: true,
    })
  } catch (error) {
    console.error("❌ [Stripe] Failed to create account:", error)

    // Handle specific Stripe errors
    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return NextResponse.json({ error: "Too many requests. Please try again in a moment." }, { status: 429 })
      }

      if (error.message.includes("api_key")) {
        return NextResponse.json({ error: "Stripe configuration error. Please contact support." }, { status: 500 })
      }
    }

    return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 })
  }
}

// Handle GET requests for debugging
export async function GET() {
  return NextResponse.json({
    message: "Stripe account creation endpoint",
    method: "POST",
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://massclip.pro",
    stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
  })
}
