import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest, adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 Starting Stripe Connect URL generation...")

    // Check required environment variables
    const requiredEnvVars = {
      STRIPE_CLIENT_ID: process.env.STRIPE_CLIENT_ID,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL,
    }

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      console.error("❌ Missing environment variables:", missingVars)
      return NextResponse.json(
        {
          error: "Stripe Connect not configured",
          details: `Missing environment variables: ${missingVars.join(", ")}`,
          missingVars,
        },
        { status: 500 },
      )
    }

    // Get authenticated user
    const { uid } = await getUserFromRequest(request)
    console.log("👤 User authenticated:", uid)

    // Get user profile from Firestore
    const userDoc = await adminDb.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      console.error("❌ User profile not found")
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    console.log("📄 User data retrieved")

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
    const baseUrl = requiredEnvVars.NEXT_PUBLIC_SITE_URL!
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
  } catch (error: any) {
    console.error("❌ Error generating Stripe Connect URL:", error)
    return NextResponse.json(
      {
        error: "Failed to generate connect URL",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
