import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`🔧 Starting Stripe OAuth for user: ${userId}`)

    // Check if user already has a Stripe account
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (userData?.stripeAccountId) {
      console.log(`⚠️ User ${userId} already has Stripe account: ${userData.stripeAccountId}`)
      return NextResponse.json({ error: "User already has a Stripe account" }, { status: 400 })
    }

    // Get the base URL and Stripe client ID from environment
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://massclip.pro"
    const clientId = process.env.STRIPE_CLIENT_ID

    if (!clientId) {
      console.error("❌ STRIPE_CLIENT_ID not configured")
      return NextResponse.json({ error: "Stripe OAuth not configured" }, { status: 500 })
    }

    // Create OAuth URL for existing account connection
    const oauthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${encodeURIComponent(
      `${baseUrl}/api/stripe/oauth-callback`,
    )}&state=${userId}`

    console.log(`🔗 Generated OAuth URL for user: ${userId}`)

    return NextResponse.json({
      url: oauthUrl,
    })
  } catch (error: any) {
    console.error("❌ Failed to create OAuth URL:", error)
    return NextResponse.json({ error: "Failed to connect existing account" }, { status: 500 })
  }
}
