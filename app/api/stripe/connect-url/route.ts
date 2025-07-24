import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb, getUserFromRequest } from "@/lib/firebase-admin"

// Initialize Stripe with live secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 Starting Stripe Express account setup...")

    // Verify Stripe credentials are present
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ STRIPE_SECRET_KEY not found")
      return NextResponse.json(
        { error: "Stripe not configured", details: "Missing STRIPE_SECRET_KEY" },
        { status: 500 },
      )
    }

    if (!process.env.STRIPE_SECRET_KEY.startsWith("sk_live_")) {
      console.warn("⚠️ Not using live Stripe keys")
    }

    // Get authenticated user with proper authorization
    const user = await getUserFromRequest(request)
    console.log("👤 User authenticated:", user.uid)

    // Get user profile from Firestore
    const userDoc = await adminDb.collection("users").doc(user.uid).get()

    if (!userDoc.exists) {
      console.error("❌ User profile not found")
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    let stripeAccountId = userData.stripeAccountId

    // Create Stripe Express account if it doesn't exist
    if (!stripeAccountId) {
      console.log("📝 Creating new Stripe Express account...")

      try {
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          settings: {
            payouts: {
              schedule: {
                interval: "daily",
              },
            },
          },
        })

        stripeAccountId = account.id
        console.log("✅ Created Stripe account:", stripeAccountId)

        // Save the account ID to Firestore
        await adminDb.collection("users").doc(user.uid).update({
          stripeAccountId: stripeAccountId,
          stripeAccountCreated: new Date(),
          stripeAccountStatus: "pending",
          updatedAt: new Date(),
        })
      } catch (stripeError: any) {
        console.error("❌ Stripe account creation failed:", stripeError)
        return NextResponse.json(
          {
            error: "Failed to create Stripe account",
            details: stripeError.message || "Unknown Stripe error",
          },
          { status: 500 },
        )
      }
    }

    // Create Express account link for onboarding
    console.log("🔗 Creating Express account link...")

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
    if (!baseUrl) {
      console.error("❌ No base URL configured")
      return NextResponse.json({ error: "Site URL not configured" }, { status: 500 })
    }

    try {
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${baseUrl}/dashboard/earnings?refresh=true`,
        return_url: `${baseUrl}/dashboard/earnings?connected=true`,
        type: "account_onboarding",
      })

      console.log("✅ Express account link created successfully")

      return NextResponse.json({
        success: true,
        connectUrl: accountLink.url,
        accountId: stripeAccountId,
      })
    } catch (stripeError: any) {
      console.error("❌ Account link creation failed:", stripeError)
      return NextResponse.json(
        {
          error: "Failed to create account link",
          details: stripeError.message || "Unknown Stripe error",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ Error in Stripe connect URL:", error)
    return NextResponse.json(
      {
        error: "Failed to create Stripe connection URL",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
