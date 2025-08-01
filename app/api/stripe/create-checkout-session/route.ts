import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { verifyIdTokenFromRequest } from "@/lib/auth-utils"

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const auth = getAuth()
const db = getFirestore()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [Checkout API] Starting checkout session creation...")

    const body = await request.json()
    const { priceId, bundleId, successUrl, cancelUrl } = body

    console.log("📝 [Checkout API] Request data:", {
      priceId,
      bundleId,
      successUrl,
      cancelUrl,
      hasAuthHeader: !!request.headers.get("authorization"),
    })

    // Validate required fields
    if (!priceId || !bundleId) {
      console.error("❌ [Checkout API] Missing required fields:", { priceId, bundleId })
      return NextResponse.json(
        {
          error: "Missing required fields",
          code: "MISSING_FIELDS",
          details: "priceId and bundleId are required",
        },
        { status: 400 },
      )
    }

    // Verify Firebase token from Authorization header
    let decodedToken
    try {
      console.log("🔐 [Checkout API] Verifying Firebase token from Authorization header...")
      decodedToken = await verifyIdTokenFromRequest(request)

      if (!decodedToken) {
        console.error("❌ [Checkout API] No valid token found in Authorization header")
        return NextResponse.json(
          {
            error: "Authentication required",
            code: "MISSING_TOKEN",
            details: "Valid Authorization header with Bearer token is required",
          },
          { status: 401 },
        )
      }

      console.log("✅ [Checkout API] Token verified for user:", {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
      })
    } catch (error: any) {
      console.error("❌ [Checkout API] Token verification failed:", {
        error: error.message,
        code: error.code,
      })
      return NextResponse.json(
        {
          error: "Invalid authentication token",
          code: "INVALID_TOKEN",
          details: error.message,
        },
        { status: 401 },
      )
    }

    const buyerUid = decodedToken.uid
    const buyerEmail = decodedToken.email || ""

    // Get buyer profile from database
    let buyerProfile
    try {
      console.log("👤 [Checkout API] Looking up buyer profile...")
      const userDoc = await db.collection("users").doc(buyerUid).get()

      if (!userDoc.exists) {
        console.warn("⚠️ [Checkout API] Buyer profile not found, creating minimal profile")
        buyerProfile = {
          email: buyerEmail,
          displayName: buyerEmail.split("@")[0],
          createdAt: new Date(),
        }

        // Create minimal profile
        await db.collection("users").doc(buyerUid).set(buyerProfile)
        console.log("✅ [Checkout API] Created minimal buyer profile")
      } else {
        buyerProfile = userDoc.data()
        console.log("✅ [Checkout API] Buyer profile found:", {
          displayName: buyerProfile.displayName,
          email: buyerProfile.email,
        })
      }
    } catch (error: any) {
      console.error("❌ [Checkout API] Error fetching buyer profile:", error.message)
      return NextResponse.json(
        {
          error: "Failed to verify buyer profile",
          code: "PROFILE_ERROR",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Get bundle/product box details
    let bundleData
    try {
      console.log("📦 [Checkout API] Looking up bundle/product box...")
      const bundleDoc = await db.collection("productBoxes").doc(bundleId).get()

      if (!bundleDoc.exists) {
        console.error("❌ [Checkout API] Bundle/Product box not found:", bundleId)
        return NextResponse.json(
          {
            error: "Product not found",
            code: "PRODUCT_NOT_FOUND",
            details: `Bundle/Product box ${bundleId} does not exist`,
          },
          { status: 404 },
        )
      }

      bundleData = bundleDoc.data()
      console.log("✅ [Checkout API] Bundle found:", {
        title: bundleData.title,
        price: bundleData.price,
        active: bundleData.active,
        creatorId: bundleData.creatorId,
      })

      // Check if bundle is active
      if (bundleData.active === false) {
        console.error("❌ [Checkout API] Bundle is inactive:", bundleId)
        return NextResponse.json(
          {
            error: "Product is not available",
            code: "BUNDLE_INACTIVE",
            details: "This product is currently inactive",
          },
          { status: 400 },
        )
      }
    } catch (error: any) {
      console.error("❌ [Checkout API] Error fetching bundle:", error.message)
      return NextResponse.json(
        {
          error: "Failed to fetch product details",
          code: "BUNDLE_ERROR",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Get seller's Stripe account
    const sellerId = bundleData.creatorId
    if (!sellerId) {
      console.error("❌ [Checkout API] No seller ID found for bundle:", bundleId)
      return NextResponse.json(
        {
          error: "Invalid product configuration",
          code: "NO_SELLER",
          details: "Product has no associated seller",
        },
        { status: 400 },
      )
    }

    let sellerStripeAccountId
    try {
      console.log("💳 [Checkout API] Looking up seller Stripe account...")
      const sellerDoc = await db.collection("users").doc(sellerId).get()

      if (!sellerDoc.exists) {
        console.error("❌ [Checkout API] Seller not found:", sellerId)
        return NextResponse.json(
          {
            error: "Seller not found",
            code: "SELLER_NOT_FOUND",
            details: `Seller ${sellerId} does not exist`,
          },
          { status: 404 },
        )
      }

      const sellerData = sellerDoc.data()
      sellerStripeAccountId = sellerData.stripeAccountId

      if (!sellerStripeAccountId) {
        console.error("❌ [Checkout API] Seller has no Stripe account:", sellerId)
        return NextResponse.json(
          {
            error: "Seller payment not configured",
            code: "NO_STRIPE_ACCOUNT",
            details: "Seller has not set up payment processing",
          },
          { status: 400 },
        )
      }

      console.log("✅ [Checkout API] Seller Stripe account found:", sellerStripeAccountId)
    } catch (error: any) {
      console.error("❌ [Checkout API] Error fetching seller:", error.message)
      return NextResponse.json(
        {
          error: "Failed to verify seller",
          code: "SELLER_ERROR",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Create comprehensive metadata
    const metadata = {
      buyerUid,
      buyerEmail,
      buyerName: buyerProfile.displayName || buyerProfile.username || buyerEmail.split("@")[0],
      bundleId,
      sellerId,
      sellerStripeAccountId,
      productType: "bundle",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    }

    console.log("📋 [Checkout API] Session metadata:", metadata)

    // Create Stripe checkout session
    let session
    try {
      console.log("💳 [Checkout API] Creating Stripe checkout session...")

      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&buyer_uid=${buyerUid}`,
        cancel_url: cancelUrl,
        metadata,
        payment_intent_data: {
          metadata,
          transfer_data: {
            destination: sellerStripeAccountId,
          },
        },
        customer_email: buyerEmail,
      })

      console.log("✅ [Checkout API] Checkout session created:", {
        sessionId: session.id,
        url: session.url,
        buyerUid,
        bundleId,
      })
    } catch (error: any) {
      console.error("❌ [Checkout API] Stripe session creation failed:", {
        error: error.message,
        type: error.type,
        code: error.code,
      })
      return NextResponse.json(
        {
          error: "Failed to create checkout session",
          code: "STRIPE_ERROR",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Log successful session creation
    console.log("🎉 [Checkout API] Checkout session created successfully:", {
      sessionId: session.id,
      buyerUid,
      bundleId,
      sellerId,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      buyerUid,
      bundleId,
      sellerId,
    })
  } catch (error: any) {
    console.error("❌ [Checkout API] Unexpected error in checkout session creation:", {
      error: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
