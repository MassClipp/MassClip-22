import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [Checkout API] Starting checkout session creation...")

    const body = await request.json()
    console.log("📝 [Checkout API] Request body:", { ...body, idToken: "[REDACTED]" })

    const { idToken, productBoxId, priceInCents } = body

    if (!idToken) {
      console.error("❌ [Checkout API] Missing idToken")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    if (!productBoxId) {
      console.error("❌ [Checkout API] Missing productBoxId")
      return NextResponse.json({ error: "Product Box ID is required" }, { status: 400 })
    }

    if (!priceInCents || priceInCents < 50) {
      console.error("❌ [Checkout API] Invalid price:", priceInCents)
      return NextResponse.json({ error: "Invalid price amount" }, { status: 400 })
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
    console.log("📦 [Checkout API] Fetching product box:", productBoxId)
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      console.error("❌ [Checkout API] Product box not found:", productBoxId)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()!
    console.log("✅ [Checkout API] Product box found:", productBox.title)

    // Get the current domain from the request
    const host = request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    const currentDomain = `${protocol}://${host}`

    console.log("🌐 [Checkout API] Current domain:", currentDomain)
    console.log("🌐 [Checkout API] Request headers:", {
      host: request.headers.get("host"),
      "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
      "x-forwarded-host": request.headers.get("x-forwarded-host"),
      origin: request.headers.get("origin"),
    })

    // Use the current domain for success/cancel URLs to maintain authentication
    const successUrl = `${currentDomain}/purchase-success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${currentDomain}/product-box/${productBoxId}`

    console.log("🔗 [Checkout API] Success URL:", successUrl)
    console.log("🔗 [Checkout API] Cancel URL:", cancelUrl)

    // Create Stripe checkout session
    console.log("💳 [Checkout API] Creating Stripe session...")
    const sessionParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBox.title || `Product Box ${productBoxId}`,
              description: productBox.description || "Digital content access",
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment" as const,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        productBoxId,
        creatorId: productBox.creatorId || "",
        domain: currentDomain, // Store the domain for debugging
      },
    }

    console.log("🔧 [Checkout API] Session params:", {
      ...sessionParams,
      success_url: sessionParams.success_url,
      cancel_url: sessionParams.cancel_url,
    })

    const session = await stripe.checkout.sessions.create(sessionParams)

    console.log("✅ [Checkout API] Session created successfully:", session.id)
    console.log("🔗 [Checkout API] Checkout URL:", session.url)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      domain: currentDomain, // Return domain for debugging
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
