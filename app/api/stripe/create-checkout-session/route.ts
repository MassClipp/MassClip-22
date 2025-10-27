import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import Stripe from "stripe"
import { getPlatformFeePercentage, calculatePlatformFee } from "@/lib/subscription"

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

// Helper function to get connected Stripe account
async function getConnectedStripeAccount(userId: string) {
  try {
    const connectedAccountDoc = await db.collection("connectedStripeAccounts").doc(userId).get()
    if (connectedAccountDoc.exists) {
      const accountData = connectedAccountDoc.data()
      console.log(`✅ [Checkout] Found connected Stripe account:`, {
        userId,
        stripe_user_id: accountData?.stripe_user_id,
        charges_enabled: accountData?.charges_enabled,
        details_submitted: accountData?.details_submitted,
      })
      return accountData
    }
    return null
  } catch (error) {
    console.error(`❌ [Checkout] Error fetching connected account:`, error)
    return null
  }
}

// Helper function to get user's subscription plan
async function getUserPlan(userId: string): Promise<string> {
  try {
    const userDoc = await db.collection("users").doc(userId).get()
    if (userDoc.exists) {
      const userData = userDoc.data()
      return userData?.plan || "free"
    }
    return "free"
  } catch (error) {
    console.error(`❌ [Checkout] Error fetching user plan:`, error)
    return "free"
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [Checkout API] Starting checkout session creation...")

    const body = await request.json()
    console.log("📝 [Checkout API] Request body:", { ...body, idToken: body.idToken ? "[REDACTED]" : "MISSING" })

    const { idToken, priceId, bundleId, successUrl, cancelUrl, productBoxId, customerEmail, buyerUserId } = body

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
    let buyerPlan = "free"

    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        buyerUid = decodedToken.uid
        buyerEmail = decodedToken.email || ""
        buyerName = decodedToken.name || decodedToken.email?.split("@")[0] || ""
        
        // Get buyer's subscription plan for platform fee calculation
        buyerPlan = await getUserPlan(buyerUid)
        
        console.log("✅ [Checkout API] Authenticated buyer:", { buyerUid, buyerEmail, buyerPlan })
      } catch (error) {
        console.error("❌ [Checkout API] Token verification failed:", error)
        // Continue as anonymous buyer with free plan
        buyerUid = "anonymous"
        buyerPlan = "free"
      }
    } else {
      console.log("⚠️ [Checkout API] No authentication token, proceeding as anonymous buyer with free plan")
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

    // Get creator's connected Stripe account
    const connectedAccount = await getConnectedStripeAccount(bundle.creatorId)
    
    if (!connectedAccount || !connectedAccount.stripe_user_id) {
      return NextResponse.json(
        {
          error: "Creator's Stripe account not connected",
          code: "CREATOR_NO_STRIPE_ACCOUNT",
          message: "The creator has not connected their Stripe account yet",
        },
        { status: 400 },
      )
    }

    // Verify account is properly set up
    if (!connectedAccount.charges_enabled || !connectedAccount.details_submitted) {
      return NextResponse.json(
        {
          error: "Creator's Stripe account setup incomplete",
          code: "CREATOR_STRIPE_ACCOUNT_INCOMPLETE",
          message: "The creator's Stripe account setup is not complete",
        },
        { status: 400 },
      )
    }

    const finalPriceId = bundleStripePriceId

    // Calculate platform fee based on buyer's plan
    const bundlePrice = bundle.price || 0 // Price in dollars
    const bundlePriceCents = Math.round(bundlePrice * 100) // Convert to cents
    const platformFeePercentage = getPlatformFeePercentage(buyerPlan)
    const platformFeeCents = calculatePlatformFee(bundlePriceCents, buyerPlan)
    const creatorEarningsCents = bundlePriceCents - platformFeeCents

    console.log("💰 [Checkout API] Platform fee calculation:", {
      buyerPlan,
      bundlePrice: bundlePrice,
      bundlePriceCents,
      platformFeePercentage,
      platformFeeCents,
      creatorEarningsCents,
      platformFeeDollars: platformFeeCents / 100,
      creatorEarningsDollars: creatorEarningsCents / 100,
    })

    console.log("💳 [Checkout API] Creating checkout session with buyer info and platform fee:", {
      finalPriceId,
      bundleId: itemId,
      stripeAccountId,
      buyerUid,
      buyerEmail,
      buyerPlan,
      platformFeeCents,
      isAuthenticated: buyerUid !== "anonymous",
    })

    // Get the current domain from headers
    const host = request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    const currentDomain = `${protocol}://${host}`

    // CRITICAL: Include comprehensive buyer metadata with platform fee info
    const sessionMetadata: any = {
      bundleId: itemId,
      productBoxId: itemId, // For compatibility
      creatorId: bundle.creatorId || "",
      buyerUid, // CRITICAL: Buyer identification
      buyerEmail,
      buyerName,
      buyerPlan, // CRITICAL: For platform fee calculation
      isAuthenticated: buyerUid !== "anonymous" ? "true" : "false",
      contentType: "bundle",
      itemTitle: bundle.title || "Digital Content",
      originalDomain: currentDomain,
      timestamp: new Date().toISOString(),
      stripeAccountId: stripeAccountId, // CRITICAL: For webhook to retrieve session from correct account
      
      // Platform fee information
      platformFeePercentage: platformFeePercentage.toString(),
      platformFeeCents: platformFeeCents.toString(),
      creatorEarningsCents: creatorEarningsCents.toString(),
      bundlePriceCents: bundlePriceCents.toString(),
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
        successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/bundles/${itemId}`,
      metadata: sessionMetadata,
      payment_intent_data: {
        metadata: sessionMetadata,
        // CRITICAL: Apply platform fee using application_fee_amount
        application_fee_amount: platformFeeCents,
      },
      allow_promotion_codes: true,
    }

    // Add customer email if available
    if (customerEmail) {
      sessionParams.customer_email = customerEmail
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

    console.log("🔄 [Checkout API] Creating Stripe session with buyer metadata and platform fee:", {
      priceId: finalPriceId,
      stripeAccount: stripeAccountId,
      buyerUid,
      buyerEmail,
      buyerPlan,
      platformFeeCents,
      applicationFeeAmount: platformFeeCents,
      successUrl: sessionParams.success_url,
      cancelUrl: sessionParams.cancel_url,
    })

    const session = await stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: stripeAccountId,
    })

    console.log("✅ [Checkout API] Session created successfully with platform fee:")
    console.log("   Session ID:", session.id)
    console.log("   Buyer UID:", buyerUid)
    console.log("   Buyer Plan:", buyerPlan)
    console.log("   Buyer Email:", buyerEmail)
    console.log("   Platform Fee:", `$${(platformFeeCents / 100).toFixed(2)} (${platformFeePercentage}%)`)
    console.log("   Creator Earnings:", `$${(creatorEarningsCents / 100).toFixed(2)}`)
    console.log("   Checkout URL:", session.url)
    console.log("   Metadata:", session.metadata)

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      buyerUid,
      buyerPlan,
      platformFee: platformFeeCents / 100,
      creatorEarnings: creatorEarningsCents / 100,
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
