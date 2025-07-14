import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"
import { verifyIdToken } from "@/lib/auth-utils"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, creatorId } = await request.json()

    console.log("🛒 [Stripe Checkout] Creating checkout session:", { productBoxId, creatorId })

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    // Get authenticated user if available
    let authenticatedUser = null
    try {
      authenticatedUser = await verifyIdToken(request)
      console.log("✅ [Stripe Checkout] Authenticated user:", authenticatedUser?.uid)
    } catch (error) {
      console.log("ℹ️ [Stripe Checkout] No authenticated user, proceeding as anonymous")
    }

    const buyerUid = authenticatedUser?.uid || `anonymous_${Date.now()}`
    const userEmail = authenticatedUser?.email || ""
    const userName = authenticatedUser?.name || authenticatedUser?.email?.split("@")[0] || "Anonymous User"

    // Get bundle/product box data
    let bundleData = null
    let bundleSource = ""

    // Try bundles collection first
    const bundleDoc = await db.collection("bundles").doc(productBoxId).get()
    if (bundleDoc.exists()) {
      bundleData = bundleDoc.data()!
      bundleSource = "bundles"
    } else {
      // Try productBoxes collection
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      if (productBoxDoc.exists()) {
        bundleData = productBoxDoc.data()!
        bundleSource = "productBoxes"
      }
    }

    if (!bundleData) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    console.log("📦 [Stripe Checkout] Found bundle:", {
      title: bundleData.title,
      price: bundleData.price,
      source: bundleSource,
    })

    // Get creator information
    let creatorData = null
    if (creatorId || bundleData.creatorId) {
      const creatorDoc = await db
        .collection("users")
        .doc(creatorId || bundleData.creatorId)
        .get()
      if (creatorDoc.exists()) {
        creatorData = creatorDoc.data()!
      }
    }

    // Create comprehensive metadata for the session
    const sessionMetadata = {
      productBoxId,
      bundleId: productBoxId,
      buyerUid,
      userId: buyerUid,
      userEmail,
      userName,
      creatorId: creatorId || bundleData.creatorId || "",
      bundleTitle: bundleData.title || "Untitled Bundle",
      bundleSource,
      checkoutTimestamp: new Date().toISOString(),
    }

    console.log("📊 [Stripe Checkout] Session metadata:", sessionMetadata)

    // Construct proper success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://localhost:3000"
    const successUrl = `${baseUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${productBoxId}&creator_id=${creatorId || bundleData.creatorId || ""}&buyer_uid=${buyerUid}`
    const cancelUrl = `${baseUrl}/product-box/${productBoxId}?checkout=cancelled`

    console.log("🔗 [Stripe Checkout] Redirect URLs:", { successUrl, cancelUrl })

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: bundleData.title || "Premium Content Bundle",
              description: bundleData.description || "Access to premium content",
              images: bundleData.thumbnailUrl ? [bundleData.thumbnailUrl] : [],
              metadata: {
                productBoxId,
                bundleId: productBoxId,
                creatorId: creatorId || bundleData.creatorId || "",
              },
            },
            unit_amount: Math.round((bundleData.price || 0) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: buyerUid, // This helps identify the user
      customer_email: userEmail || undefined,
      metadata: sessionMetadata,

      // Enable automatic tax calculation if needed
      automatic_tax: { enabled: false },

      // Set session expiration
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes from now

      // Additional configuration
      billing_address_collection: "auto",
      shipping_address_collection: undefined,

      // Custom fields for additional user info if needed
      custom_fields: userEmail
        ? []
        : [
            {
              key: "email",
              label: { type: "custom", custom: "Email Address" },
              type: "text",
              optional: false,
            },
          ],
    })

    console.log("✅ [Stripe Checkout] Session created successfully:", {
      sessionId: session.id,
      url: session.url,
      metadata: session.metadata,
    })

    // Store checkout attempt for tracking
    try {
      await db
        .collection("checkoutAttempts")
        .doc(session.id)
        .set({
          sessionId: session.id,
          productBoxId,
          bundleId: productBoxId,
          buyerUid,
          userEmail,
          userName,
          creatorId: creatorId || bundleData.creatorId || "",
          bundleTitle: bundleData.title || "Untitled Bundle",
          amount: bundleData.price || 0,
          currency: "usd",
          status: "created",
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          metadata: sessionMetadata,
        })
      console.log("📝 [Stripe Checkout] Checkout attempt logged")
    } catch (error) {
      console.warn("⚠️ [Stripe Checkout] Failed to log checkout attempt:", error)
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      success: true,
    })
  } catch (error) {
    console.error("❌ [Stripe Checkout] Error creating checkout session:", error)
    return NextResponse.json({ error: "Failed to create checkout session", details: error.message }, { status: 500 })
  }
}
