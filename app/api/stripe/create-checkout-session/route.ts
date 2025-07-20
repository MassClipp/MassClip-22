import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [Checkout API] Starting checkout session creation...")

    const body = await request.json()
    console.log("📝 [Checkout API] Request body:", { ...body, idToken: "[REDACTED]" })

    const { idToken, priceId, bundleId, successUrl, cancelUrl } = body

    if (!idToken) {
      console.error("❌ [Checkout API] Missing idToken")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    if (!priceId) {
      console.error("❌ [Checkout API] Missing priceId")
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 })
    }

    // Verify Firebase token
    console.log("🔐 [Checkout API] Verifying Firebase token...")
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Checkout API] Token verified for user:", decodedToken.uid)
    } catch (error) {
      console.error("❌ [Checkout API] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get product box details
    console.log("📦 [Checkout API] Fetching product box:", bundleId)
    const productBoxDoc = await db.collection("productBoxes").doc(bundleId).get()
    if (!productBoxDoc.exists) {
      console.error("❌ [Checkout API] Product box not found:", bundleId)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()!
    console.log("✅ [Checkout API] Product box found:", productBox.title)

    // Get the current domain from multiple sources
    const host = request.headers.get("host")
    const forwardedHost = request.headers.get("x-forwarded-host")
    const origin = request.headers.get("origin")
    const referer = request.headers.get("referer")
    const protocol = request.headers.get("x-forwarded-proto") || "https"

    console.log("🌐 [Checkout API] Domain detection headers:", {
      host,
      forwardedHost,
      origin,
      referer,
      protocol,
    })

    // Determine the correct domain to use
    let currentDomain: string

    if (origin) {
      // Use origin header if available (most reliable)
      currentDomain = origin
      console.log("✅ [Checkout API] Using origin header:", currentDomain)
    } else if (referer) {
      // Extract domain from referer
      try {
        const refererUrl = new URL(referer)
        currentDomain = `${refererUrl.protocol}//${refererUrl.host}`
        console.log("✅ [Checkout API] Using referer header:", currentDomain)
      } catch {
        currentDomain = `${protocol}://${host}`
        console.log("⚠️ [Checkout API] Referer parsing failed, using host:", currentDomain)
      }
    } else {
      // Fallback to host header
      currentDomain = `${protocol}://${forwardedHost || host}`
      console.log("⚠️ [Checkout API] Using fallback host:", currentDomain)
    }

    // For v0 preview environments, ensure we use the correct domain format
    if (host && host.includes("vercel.app") && !currentDomain.includes("vercel.app")) {
      currentDomain = `${protocol}://${host}`
      console.log("🔧 [Checkout API] Corrected for Vercel preview:", currentDomain)
    }

    console.log("Creating checkout session for:", { priceId, bundleId })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${currentDomain}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${currentDomain}/creator/${bundleId}`,
      metadata: {
        userId,
        bundleId: bundleId || "",
        creatorId: productBox.creatorId || "",
        originalDomain: currentDomain,
        timestamp: new Date().toISOString(),
      },
    })

    console.log("✅ [Checkout API] Session created successfully:")
    console.log("   Session ID:", session.id)
    console.log("   Checkout URL:", session.url)
    console.log("   Success URL will redirect to:", session.url)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      domain: currentDomain,
      successUrl: session.url,
    })
  } catch (error: any) {
    console.error("❌ [Checkout API] Session creation failed:", error)
    console.error("❌ [Checkout API] Error details:", {
      message: error.message,
      type: error.type,
      code: error.code,
    })

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
