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

    const { idToken, priceId, bundleId, successUrl, cancelUrl } = body

    if (!priceId || !bundleId) {
      console.error("❌ [Checkout API] Missing required parameters")
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    let userId: string | null = null
    let userEmail: string | null = null

    // If idToken is provided, verify it
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        userEmail = decodedToken.email || null
        console.log("✅ [Checkout API] Token verified for user:", userId)
      } catch (error) {
        console.error("❌ [Checkout API] Token verification failed:", error)
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
      }
    } else {
      console.log("⚠️ [Checkout API] No idToken provided, proceeding without user authentication")
    }

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
    })

    // Get the current domain from headers
    const host = request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    const currentDomain = `${protocol}://${host}`

    const sessionMetadata: any = {
      bundleId: bundleId,
      creatorId: bundle.creatorId || "",
      originalDomain: currentDomain,
      timestamp: new Date().toISOString(),
    }

    if (userId) {
      sessionMetadata.userId = userId
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
      success_url: successUrl || `${currentDomain}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${currentDomain}/creator/${bundle.creatorId}`,
      metadata: sessionMetadata,
      payment_intent_data: {
        metadata: sessionMetadata,
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
    })

    const session = await stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: stripeAccountId,
    })

    console.log("✅ [Checkout API] Session created successfully:")
    console.log("   Session ID:", session.id)
    console.log("   Checkout URL:", session.url)
    console.log("   Success URL:", session.success_url)
    console.log("   Cancel URL:", session.cancel_url)

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
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
