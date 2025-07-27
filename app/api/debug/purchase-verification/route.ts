import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Purchase Verification Debug] Starting debug check...")

    // Check authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required", details: "Missing or invalid authorization header" },
        { status: 401 },
      )
    }

    const token = authHeader.split("Bearer ")[1]
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
      console.log("✅ [Purchase Verification Debug] User authenticated:", decodedToken.uid)
    } catch (error: any) {
      console.error("❌ [Purchase Verification Debug] Auth failed:", error)
      return NextResponse.json({ error: "Authentication failed", details: error.message }, { status: 401 })
    }

    const body = await request.json()
    console.log("📝 [Purchase Verification Debug] Request body:", body)

    const debugInfo = {
      authenticated: true,
      userId: decodedToken.uid,
      userEmail: decodedToken.email,
      requestBody: body,
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      },
      availableEndpoints: [
        "/api/purchase/verify-session",
        "/api/purchase/complete",
        "/api/debug/purchase-session-analysis",
        "/api/debug/stripe-environment",
      ],
    }

    console.log("✅ [Purchase Verification Debug] Debug info compiled")
    return NextResponse.json(debugInfo)
  } catch (error: any) {
    console.error("❌ [Purchase Verification Debug] Debug failed:", error)
    return NextResponse.json(
      {
        error: "Debug check failed",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
