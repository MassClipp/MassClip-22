import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import Stripe from "stripe"

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

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [Checkout API] Starting checkout session creation...")

    const body = await request.json()
    console.log("📝 [Checkout API] Request body:", { ...body, idToken: body.idToken ? "[REDACTED]" : "MISSING" })

    const { idToken, priceId, bundleId, successUrl, cancelUrl, productBoxId } = body

    // Determine what we're selling
    const itemId = bundleId || productBoxId
    if (!itemId) {
      console.error("❌ [Checkout API] Missing item ID")
      return NextResponse.json({ error: "Missing product or bundle ID" }, { status: 400 })
    }

    // Get buyer information from authentication
    let buyerUid = "anonymous"
    let buyerEmail = ""
    let buyerName = ""

    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        buyerUid = decodedToken.uid
        buyerEmail = decodedToken.email || ""
        buyerName = decodedToken.name || decodedToken.email?.split("@")[0] || ""
        console.log("✅ [Checkout API] Authenticated buyer:", { buyerUid, buyerEmail })
      } catch (error) {
        console.error("❌ [Checkout API] Token verification failed:", error)
        // Continue as anonymous buyer
        buyerUid = "anonymous"
      }
    } else {
      console.log("⚠️ [Checkout API] No authentication token, proceeding as anonymous buyer")
    }

    // Get bundle details from bundles collection
    console.log("📦 [Checkout API] Fetching item:", itemId)
    const bundleDoc = await db.collection("bundles").doc(itemId).get()
    if (!bundleDoc.exists) {
      console.error("❌ [Checkout API] Bundle not found:", itemId)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundle = bundleDoc.data()!
    console.log("✅ [Checkout API] Bundle found:", {
      title: bundle.title,
      price: bundle.price,
      priceId: bundle.priceId,
      stripePriceId: bundle.stripePriceId,
      productId: bundle.productId,
      stripeProductId: bundle.stripeProductId,
      creatorId: bundle.creatorId,
      stripeAccountId: bundle.stripeAccountId,
    })

    // Get the correct price ID from bundle - check both possible field names
    const bundleStripePriceId = bundle.priceId || bundle.stripePriceId
    const stripeAccountId = bundle.stripeAccountId

    if (!stripeAccountId) {
      console.error("❌ [Checkout API] No Stripe account ID for bundle:", itemId)
      return NextResponse.json(
        {
          error: "Bundle not available for purchase",
          details: "Creator has not set up Stripe integration",
        },
        { status: 400 },
      )
    }

    if (!bundleStripePriceId) {
      console.error("❌ [Checkout API] No Stripe price ID for bundle:", itemId)
      return NextResponse.json(
        {
          error: "Bundle pricing not configured",
          details: "Bundle does not have a valid price ID",
        },
        { status: 400 },
      )
    }

    // Use the bundle's stored price ID instead of validating against the provided one
    const finalPriceId = bundleStripePriceId

    console.log("💳 [Checkout API] Creating checkout session with buyer info:", {
      finalPriceId,
      bundleId: itemId,
      stripeAccountId,
      buyerUid,
      buyerEmail,
      isAuthenticated: buyerUid !== "anonymous",
    })

    // Get the current domain from headers
    const host = request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    const currentDomain = `${protocol}://${host}`

    // CRITICAL: Include comprehensive buyer metadata
    const sessionMetadata: any = {
      bundleId: itemId,
      productBoxId: itemId, // For compatibility
      creatorId: bundle.creatorId || "",
      buyerUid, // CRITICAL: Buyer identification
      buyerEmail,
      buyerName,
      isAuthenticated: buyerUid !== "anonymous" ? "true" : "false",
      contentType: "bundle",
      itemTitle: bundle.title || "Digital Content",
      originalDomain: currentDomain,
      timestamp: new Date().toISOString(),
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:
        successUrl || `${currentDomain}/purchase-success?session_id={CHECKOUT_SESSION_ID}&buyer_uid=${buyerUid}`,
      cancel_url: cancelUrl || `${currentDomain}/creator/${bundle.creatorId}`,
      metadata: sessionMetadata,
      payment_intent_data: {
        metadata: sessionMetadata,
      },
      allow_promotion_codes: true,
    }

    // Add customer email if available
    if (buyerEmail) {
      sessionParams.customer_email = buyerEmail
    }

    // For anonymous buyers, collect email
    if (buyerUid === "anonymous") {
      sessionParams.custom_fields = [
        {
          key: "buyer_email",
          label: { type: "custom", custom: "Email Address" },
          type: "text",
          optional: false,
        },
      ]
    }

    console.log("🔄 [Checkout API] Creating Stripe session with buyer metadata:", {
      priceId: finalPriceId,
      stripeAccount: stripeAccountId,
      buyerUid,
      buyerEmail,
      successUrl: sessionParams.success_url,
      cancelUrl: sessionParams.cancel_url,
    })

    const session = await stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: stripeAccountId,
    })

    console.log("✅ [Checkout API] Session created successfully with buyer identification:")
    console.log("   Session ID:", session.id)
    console.log("   Buyer UID:", buyerUid)
    console.log("   Buyer Email:", buyerEmail)
    console.log("   Checkout URL:", session.url)
    console.log("   Metadata:", session.metadata)

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      buyerUid,
      metadata: session.metadata,
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
