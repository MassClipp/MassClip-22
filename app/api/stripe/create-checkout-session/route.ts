import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

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
    console.log("🔄 Starting checkout session creation...")

    const body = await request.json()
    const { idToken, priceId, bundleId, successUrl, cancelUrl } = body

    console.log("📝 Request data:", {
      hasIdToken: !!idToken,
      priceId,
      bundleId,
      successUrl,
      cancelUrl,
    })

    // Validate required fields
    if (!idToken) {
      console.error("❌ Missing idToken in request")
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "MISSING_TOKEN",
          details: "idToken is required for checkout",
        },
        { status: 401 },
      )
    }

    if (!priceId || !bundleId) {
      console.error("❌ Missing required fields:", { priceId, bundleId })
      return NextResponse.json(
        {
          error: "Missing required fields",
          code: "MISSING_FIELDS",
          details: "priceId and bundleId are required",
        },
        { status: 400 },
      )
    }

    // Verify Firebase token
    let decodedToken
    try {
      console.log("🔐 Verifying Firebase token...")
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ Token verified for user:", decodedToken.uid)
    } catch (error: any) {
      console.error("❌ Token verification failed:", error.message)
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
      console.log("👤 Looking up buyer profile...")
      const userDoc = await db.collection("users").doc(buyerUid).get()

      if (!userDoc.exists) {
        console.warn("⚠️ Buyer profile not found, creating minimal profile")
        buyerProfile = {
          email: buyerEmail,
          displayName: buyerEmail.split("@")[0],
          createdAt: new Date(),
        }

        // Create minimal profile
        await db.collection("users").doc(buyerUid).set(buyerProfile)
      } else {
        buyerProfile = userDoc.data()
        console.log("✅ Buyer profile found:", buyerProfile.displayName || buyerProfile.email)
      }
    } catch (error: any) {
      console.error("❌ Error fetching buyer profile:", error.message)
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
      console.log("📦 Looking up bundle/product box...")
      const bundleDoc = await db.collection("productBoxes").doc(bundleId).get()

      if (!bundleDoc.exists) {
        console.error("❌ Bundle/Product box not found:", bundleId)
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
      console.log("✅ Bundle found:", bundleData.title)
    } catch (error: any) {
      console.error("❌ Error fetching bundle:", error.message)
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
      console.error("❌ No seller ID found for bundle:", bundleId)
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
      console.log("💳 Looking up seller Stripe account...")
      const sellerDoc = await db.collection("users").doc(sellerId).get()

      if (!sellerDoc.exists) {
        console.error("❌ Seller not found:", sellerId)
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
        console.error("❌ Seller has no Stripe account:", sellerId)
        return NextResponse.json(
          {
            error: "Seller payment not configured",
            code: "NO_STRIPE_ACCOUNT",
            details: "Seller has not set up payment processing",
          },
          { status: 400 },
        )
      }

      console.log("✅ Seller Stripe account found:", sellerStripeAccountId)
    } catch (error: any) {
      console.error("❌ Error fetching seller:", error.message)
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

    console.log("📋 Session metadata:", metadata)

    // Create Stripe checkout session
    let session
    try {
      console.log("💳 Creating Stripe checkout session...")

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

      console.log("✅ Checkout session created:", session.id)
    } catch (error: any) {
      console.error("❌ Stripe session creation failed:", error.message)
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
    console.log("🎉 Checkout session created successfully:", {
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
    console.error("❌ Unexpected error in checkout session creation:", error)
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
