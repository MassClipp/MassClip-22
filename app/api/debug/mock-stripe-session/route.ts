import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"

interface MockStripeSession {
  id: string
  object: string
  amount_total: number
  currency: string
  customer_details: {
    email: string
    name?: string
  }
  metadata: {
    bundleId: string
    creatorUid?: string
  }
  payment_status: string
  payment_intent: string
  livemode: boolean
  created: number
  expires_at: number
  url?: string
}

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Mock sessions only available in development" }, { status: 403 })
    }

    // Get auth token
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)

    const body = await request.json()
    const {
      bundleId = "bundle-viral-clips-pack",
      amount = 2999,
      currency = "usd",
      customerEmail,
      customerName,
      creatorUid,
      paymentStatus = "paid",
      livemode = false,
    } = body

    // Generate mock session ID
    const sessionId = `cs_test_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    const paymentIntentId = `pi_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

    const mockSession: MockStripeSession = {
      id: sessionId,
      object: "checkout.session",
      amount_total: amount,
      currency: currency,
      customer_details: {
        email: customerEmail || decodedToken.email || "test@example.com",
        name: customerName || decodedToken.name || "Test User",
      },
      metadata: {
        bundleId,
        ...(creatorUid && { creatorUid }),
      },
      payment_status: paymentStatus,
      payment_intent: paymentIntentId,
      livemode: livemode,
      created: Math.floor(Date.now() / 1000),
      expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      url: `https://checkout.stripe.com/c/pay/${sessionId}#mock`,
    }

    return NextResponse.json({
      success: true,
      session: mockSession,
      message: "Mock Stripe session created successfully",
    })
  } catch (error) {
    console.error("Mock session creation error:", error)
    return NextResponse.json(
      { error: "Failed to create mock session", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
