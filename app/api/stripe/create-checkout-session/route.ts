import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()
const auth = getAuth()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [Checkout API] Starting checkout session creation...")

    const body = await request.json()
    console.log("📝 [Checkout API] Request body:", { ...body, buyerToken: body.buyerToken ? "[REDACTED]" : "MISSING" })

    const { idToken, buyerToken, priceId, bundleId, productBoxId, successUrl, cancelUrl, price, title, creatorId } =
      body

    // Use either idToken or buyerToken for authentication
    const authToken = idToken || buyerToken

    if (!authToken) {
      console.error("❌ [Checkout API] No authentication token provided")
      return NextResponse.json({ error: "Authentication required. Please log in to make a purchase." }, { status: 401 })
    }

    // Validate required fields
    if (!bundleId && !productBoxId) {
      console.error("❌ [Checkout API] Missing product/bundle ID")
      return NextResponse.json({ error: "Product or bundle ID is required" }, { status: 400 })
    }

    if (!creatorId) {
      console.error("❌ [Checkout API] Missing creator ID")
      return NextResponse.json({ error: "Creator ID is required" }, { status: 400 })
    }

    let userId: string | null = null
    let userEmail: string | null = null

    // Verify authentication token and get buyer UID
    try {
      const decodedToken = await auth.verifyIdToken(authToken)
      userId = decodedToken.uid
      userEmail = decodedToken.email || null
      console.log("✅ [Checkout API] Token verified for buyer:", userId)
    } catch (error) {
      console.error("❌ [Checkout API] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token. Please log in again." }, { status: 401 })
    }

    if (!userId) {
      console.error("❌ [Checkout API] No user ID in token")
      return NextResponse.json({ error: "Invalid user authentication" }, { status: 401 })
    }

    // Get buyer information from database
    const buyerDoc = await db.collection("users").doc(userId).get()
    if (!buyerDoc.exists) {
      console.error("❌ [Checkout API] Buyer not found in database:", userId)
      return NextResponse.json({ error: "User account not found. Please create an account first." }, { status: 404 })
    }

    const buyerData = buyerDoc.data()!

    // Get product/bundle details
    let itemData: any = null
    let itemPrice = 0
    let itemTitle = ""
    let stripeAccountId = ""

    if (bundleId) {
      console.log("📦 [Checkout API] Fetching bundle:", bundleId)
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()
      if (!bundleDoc.exists) {
        console.error("❌ [Checkout API] Bundle not found:", bundleId)
        return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
      }
      itemData = bundleDoc.data()!
      itemPrice = itemData.price || price || 0
      itemTitle = itemData.title || title || "Bundle"
      stripeAccountId = itemData.stripeAccountId || ""
    } else if (productBoxId) {
      console.log("📦 [Checkout API] Fetching product box:", productBoxId)
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      if (!productBoxDoc.exists) {
        console.error("❌ [Checkout API] Product box not found:", productBoxId)
        return NextResponse.json({ error: "Product box not found" }, { status: 404 })
      }
      itemData = productBoxDoc.data()!
      itemPrice = itemData.price || price || 0
      itemTitle = itemData.title || title || "Product Box"
      stripeAccountId = itemData.stripeAccountId || ""
    }

    if (!stripeAccountId) {
      // Get creator's Stripe account ID
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      if (!creatorDoc.exists) {
        console.error("❌ [Checkout API] Creator not found:", creatorId)
        return NextResponse.json({ error: "Creator not found" }, { status: 404 })
      }
      const creatorData = creatorDoc.data()!
      stripeAccountId = creatorData.stripeAccountId || ""
    }

    if (!stripeAccountId) {
      console.error("❌ [Checkout API] No Stripe account ID for creator:", creatorId)
      return NextResponse.json(
        {
          error: "Creator has not connected their Stripe account",
          details: "The creator needs to set up Stripe integration to accept payments",
        },
        { status: 400 },
      )
    }

    if (!itemPrice || itemPrice <= 0) {
      console.error("❌ [Checkout API] Invalid price:", itemPrice)
      return NextResponse.json({ error: "Invalid item price" }, { status: 400 })
    }

    console.log("💳 [Checkout API] Creating checkout session with:", {
      buyerUid: userId,
      creatorId,
      bundleId: bundleId || null,
      productBoxId: productBoxId || null,
      price: itemPrice,
      stripeAccountId,
    })

    // Get the current domain from headers
    const host = request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    const currentDomain = `${protocol}://${host}`

    // Create comprehensive metadata with buyer UID (CRITICAL for preventing anonymous purchases)
    const sessionMetadata: any = {
      buyerUid: userId, // CRITICAL: Always include buyer UID
      buyerEmail: userEmail || buyerData.email || "",
      buyerName: buyerData.displayName || buyerData.name || "",
      creatorId: creatorId,
      originalDomain: currentDomain,
      timestamp: new Date().toISOString(),
      purchaseType: bundleId ? "bundle" : "product_box",
    }

    // Add specific item ID
    if (bundleId) {
      sessionMetadata.bundleId = bundleId
    }
    if (productBoxId) {
      sessionMetadata.productBoxId = productBoxId
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: itemTitle,
              description: itemData.description || "",
              images: itemData.thumbnailUrl ? [itemData.thumbnailUrl] : [],
              metadata: {
                buyerUid: userId, // Also include in product metadata
                creatorId: creatorId,
                ...(bundleId && { bundleId }),
                ...(productBoxId && { productBoxId }),
              },
            },
            unit_amount: Math.round(itemPrice * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:
        successUrl || `${currentDomain}/purchase-success?session_id={CHECKOUT_SESSION_ID}&buyer_uid=${userId}`,
      cancel_url: cancelUrl || `${currentDomain}/creator/${creatorId}`,
      metadata: sessionMetadata,
      payment_intent_data: {
        metadata: sessionMetadata, // Also include in payment intent metadata
        application_fee_amount: Math.round(itemPrice * 100 * 0.1), // 10% platform fee
      },
      customer_email: userEmail || buyerData.email,
    }

    console.log("🔄 [Checkout API] Creating Stripe session with params:", {
      price: itemPrice,
      stripeAccount: stripeAccountId,
      successUrl: sessionParams.success_url,
      cancelUrl: sessionParams.cancel_url,
      buyerUid: userId,
    })

    const session = await stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: stripeAccountId,
    })

    console.log("✅ [Checkout API] Session created successfully:")
    console.log("   Session ID:", session.id)
    console.log("   Checkout URL:", session.url)
    console.log("   Buyer UID:", userId)
    console.log("   Success URL:", session.success_url)
    console.log("   Cancel URL:", session.cancel_url)

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      buyerUid: userId, // Return buyer UID for verification
    })
  } catch (error: any) {
    console.error("❌ [Checkout API] Session creation failed:", error)
    console.error("❌ [Checkout API] Error details:", {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack,
    })

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: "Stripe error occurred",
          details: error.message,
          code: error.code,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
