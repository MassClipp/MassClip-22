import { type NextRequest, NextResponse } from "next/server"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 Starting Stripe Connect URL generation...")

    // Get authenticated user
    const { uid } = await getAuthenticatedUser(request.headers)
    console.log("👤 User authenticated:", uid)

    // Get user profile from Firestore
    const userDoc = await adminDb.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      console.error("❌ User profile not found")
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    console.log("📄 User data retrieved:", { email: userData.email, stripeAccountId: userData.stripeAccountId })

    // Check if user already has a Stripe account
    if (userData.stripeAccountId) {
      console.log("✅ User already has Stripe account:", userData.stripeAccountId)

      // Check account status
      try {
        const account = await stripe.accounts.retrieve(userData.stripeAccountId)
        console.log("📊 Account status:", {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
        })

        if (account.charges_enabled && account.payouts_enabled) {
          return NextResponse.json({
            success: true,
            message: "Account already connected and active",
            accountId: account.id,
          })
        }
      } catch (error) {
        console.error("❌ Error checking existing account:", error)
        // Continue to create new account link
      }
    }

    // Generate a unique state parameter for security
    const state = `${uid}_${Date.now()}_${Math.random().toString(36).substring(7)}`
    console.log("🔐 Generated state:", state)

    // Store state in Firestore for verification
    await adminDb
      .collection("stripe_oauth_states")
      .doc(state)
      .set({
        userId: uid,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      })

    // Create Stripe Connect OAuth URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"
    const redirectUri = `${baseUrl}/api/stripe/connect/oauth-callback`

    console.log("🌐 Using redirect URI:", redirectUri)

    const connectUrl =
      `https://connect.stripe.com/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${process.env.STRIPE_CLIENT_ID}&` +
      `scope=read_write&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`

    console.log("✅ Connect URL generated successfully")

    return NextResponse.json({
      success: true,
      connectUrl,
      state,
    })
  } catch (error) {
    console.error("❌ Error generating Stripe Connect URL:", error)
    return NextResponse.json({ error: "Failed to generate connect URL" }, { status: 500 })
  }
}
