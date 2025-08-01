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
    const idToken = body.idToken // Declare idToken here
    console.log("📝 [Checkout API] Request body:", { ...body, idToken: idToken ? "[REDACTED]" : "MISSING" })

    // Debug authentication token
    if (!idToken) {
      console.error("❌ [Checkout API] No idToken in request body")
      console.error("❌ [Checkout API] Available keys:", Object.keys(body))
      return NextResponse.json(
        {
          error: "Authentication required. Please log in to make a purchase.",
          debug: "No authentication token provided",
        },
        { status: 401 },
      )
    }

    console.log("🔍 [Checkout API] idToken length:", idToken.length)
    console.log("🔍 [Checkout API] idToken starts with:", idToken.substring(0, 20) + "...")

    const { priceId, bundleId, successUrl, cancelUrl } = body

    if (!priceId || !bundleId) {
      console.error("❌ [Checkout API] Missing required parameters")
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // CRITICAL: Require authentication token for buyer identification
    if (!idToken) {
      console.error("❌ [Checkout API] No authentication token provided - anonymous purchases not allowed")
      return NextResponse.json(
        {
          error: "Authentication required. Please log in to make a purchase.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 },
      )
    }

    let userId: string | null = null
    let userEmail: string | null = null

    // Verify authentication token and get buyer UID
    try {
      console.log("🔐 [Checkout API] Verifying Firebase token...")
      const decodedToken = await auth.verifyIdToken(idToken)
      userId = decodedToken.uid
      userEmail = decodedToken.email || null
      console.log("✅ [Checkout API] Token verified for buyer:", userId)
      console.log("   Email:", userEmail)
    } catch (error: any) {
      console.error("❌ [Checkout API] Token verification failed:", {
        error: error.message,
        code: error.code,
        tokenLength: idToken?.length || 0,
      })
      return NextResponse.json(
        {
          error: "Invalid authentication token. Please log in again.",
          code: "INVALID_TOKEN",
          details: error.message,
        },
        { status: 401 },
      )
    }

    if (!userId) {
      console.error("❌ [Checkout API] No user ID in token")
      return NextResponse.json({ error: "Invalid user authentication" }, { status: 401 })
    }

    // Verify buyer exists in database
    const buyerDoc = await db.collection("users").doc(userId).get()
    if (!buyerDoc.exists) {
      console.error("❌ [Checkout API] Buyer not found in database:", userId)
      return NextResponse.json({ error: "User account not found. Please create an account first." }, { status: 404 })
    }

    const buyerData = buyerDoc.data()!

    // Get bundle details from bundles collection
    console.log("📦 [Checkout API] Fetching bundle:", bundleId)
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.error("❌ [Checkout API] Bundle not found:", bundleId)
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
      console.error("❌ [Checkout API] No Stripe account ID for bundle:", bundleId)
      return NextResponse.json(
        {
          error: "Bundle not available for purchase",
          details: "Creator has not set up Stripe integration",
        },
        { status: 400 },
      )
    }

    if (!bundleStripePriceId) {
      console.error("❌ [Checkout API] No Stripe price ID for bundle:", bundleId)
      return NextResponse.json(
        {
          error: "Bundle pricing not configured",
          details: "Bundle does not have a valid price ID",
        },
        { status: 400 },
      )
    }

    // Use the bundle's stored price ID instead of validating against the provided one
    // This prevents mismatches due to field name inconsistencies
    const finalPriceId = bundleStripePriceId

    console.log("💳 [Checkout API] Creating checkout session with:", {
      finalPriceId,
      bundleId,
      stripeAccountId,
      providedPriceId: priceId,
      bundleStoredPriceId: bundleStripePriceId,
      buyerUid: userId, // CRITICAL: Include buyer UID
    })

    // Get the current domain from headers
    const host = request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    const currentDomain = `${protocol}://${host}`

    // CRITICAL: Create comprehensive metadata with buyer UID to prevent anonymous purchases
    const sessionMetadata: any = {
      buyerUid: userId, // CRITICAL: Always include buyer UID
      buyerEmail: userEmail || buyerData.email || "",
      buyerName: buyerData.displayName || buyerData.name || "",
      bundleId: bundleId,
      creatorId: bundle.creatorId || "",
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
        successUrl || `${currentDomain}/purchase-success?session_id={CHECKOUT_SESSION_ID}&buyer_uid=${userId}`,
      cancel_url: cancelUrl || `${currentDomain}/creator/${bundle.creatorId}`,
      metadata: sessionMetadata, // CRITICAL: Include buyer UID in metadata
      payment_intent_data: {
        metadata: sessionMetadata, // CRITICAL: Also include in payment intent metadata
      },
      allow_promotion_codes: true,
    }

    // Add customer email if available
    if (userEmail) {
      sessionParams.customer_email = userEmail
    }

    console.log("🔄 [Checkout API] Creating Stripe session with params:", {
      priceId: finalPriceId,
      stripeAccount: stripeAccountId,
      successUrl: sessionParams.success_url,
      cancelUrl: sessionParams.cancel_url,
      buyerUid: userId, // CRITICAL: Log buyer UID for verification
    })

    const session = await stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: stripeAccountId,
    })

    console.log("✅ [Checkout API] Session created successfully:")
    console.log("   Session ID:", session.id)
    console.log("   Checkout URL:", session.url)
    console.log("   Success URL:", session.success_url)
    console.log("   Cancel URL:", session.cancel_url)
    console.log("   Buyer UID:", userId) // CRITICAL: Log buyer UID for verification

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
