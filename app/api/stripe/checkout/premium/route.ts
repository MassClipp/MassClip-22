import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    console.log("🛒 [Premium Checkout] Starting premium subscription checkout")

    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      console.error("❌ [Premium Checkout] Authentication failed")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("👤 [Premium Checkout] Authenticated user:", userId)

    const { priceId, successUrl, cancelUrl } = await request.json()

    if (!priceId) {
      console.error("❌ [Premium Checkout] Missing price ID")
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 })
    }

    console.log("📋 [Premium Checkout] Request details:", {
      priceId,
      hasSuccessUrl: !!successUrl,
      hasCancelUrl: !!cancelUrl,
    })

    // Get customer email from token or user profile
    const customerEmail = decodedToken.email
    const customerName = decodedToken.name

    console.log("👤 [Premium Checkout] Customer info:", {
      hasEmail: !!customerEmail,
      hasName: !!customerName,
    })

    // Create checkout session for subscription
    const sessionData = {
      payment_method_types: ["card"] as const,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription" as const,
      success_url:
        successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      customer_email: customerEmail || undefined,
      metadata: {
        userId,
        type: "premium_subscription",
        timestamp: new Date().toISOString(),
      },
    }

    console.log("🔧 [Premium Checkout] Creating subscription session:", {
      priceId,
      hasCustomerEmail: !!sessionData.customer_email,
      metadataKeys: Object.keys(sessionData.metadata),
    })

    const session = await stripe.checkout.sessions.create(sessionData)

    console.log("✅ [Premium Checkout] Session created successfully:", {
      sessionId: session.id,
      sessionType: session.id.startsWith("cs_test_") ? "test" : "live",
      mode: session.mode,
      url: session.url,
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      mode: session.mode,
    })
  } catch (error) {
    console.error("❌ [Premium Checkout] Error creating session:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        error: "Failed to create premium checkout session",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
