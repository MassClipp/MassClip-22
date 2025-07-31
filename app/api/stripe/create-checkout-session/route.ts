import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb, getAdminAuth } from "@/lib/firebase-server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🛒 [Checkout] Starting checkout session creation...")

    const body = await request.json()
    console.log("📝 [Checkout] Request body:", { ...body, idToken: "[REDACTED]" })

    const { bundleId, successUrl, cancelUrl, idToken } = body

    // REQUIRE authentication - no anonymous checkouts allowed
    if (!idToken) {
      console.error("❌ [Checkout] Authentication required for checkout")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify Firebase token
    let userId: string
    let userEmail: string
    let userName: string
    try {
      console.log("🔐 [Checkout] Verifying Firebase token...")
      const decodedToken = await getAdminAuth().verifyIdToken(idToken)
      userId = decodedToken.uid
      userEmail = decodedToken.email || ""
      userName = decodedToken.name || ""
      console.log("✅ [Checkout] Token verified for user:", userId)
    } catch (error) {
      console.error("❌ [Checkout] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    if (!bundleId) {
      console.error("❌ [Checkout] Missing bundleId")
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 })
    }

    const db = getAdminDb()

    // Get bundle information
    console.log("📦 [Checkout] Fetching bundle:", bundleId)
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.error("❌ [Checkout] Bundle not found:", bundleId)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log("✅ [Checkout] Bundle data:", {
      title: bundleData.title,
      price: bundleData.price,
      creatorId: bundleData.creatorId,
    })

    // Get creator information and Stripe account
    const creatorId = bundleData.creatorId
    if (!creatorId) {
      console.error("❌ [Checkout] No creator ID in bundle data")
      return NextResponse.json({ error: "Bundle has no creator" }, { status: 400 })
    }

    console.log("👤 [Checkout] Fetching creator:", creatorId)
    const creatorDoc = await db.collection("users").doc(creatorId).get()

    if (!creatorDoc.exists) {
      console.error("❌ [Checkout] Creator not found:", creatorId)
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()!
    const connectedAccountId = creatorData.stripeAccountId

    if (!connectedAccountId) {
      console.error("❌ [Checkout] Creator has no Stripe account:", creatorId)
      return NextResponse.json({ error: "Creator has not connected their Stripe account" }, { status: 400 })
    }

    console.log("🔗 [Checkout] Using connected account:", connectedAccountId)

    // Get authenticated user details from Firestore
    console.log("👤 [Checkout] Fetching buyer details:", userId)
    const buyerDoc = await db.collection("users").doc(userId).get()
    let buyerData = {}

    if (buyerDoc.exists) {
      buyerData = buyerDoc.data()!
      console.log("✅ [Checkout] Buyer data retrieved:", {
        name: buyerData.displayName || buyerData.name,
        username: buyerData.username,
        email: buyerData.email,
      })
    }

    // Create comprehensive buyer metadata
    const buyerMetadata = {
      buyerUid: userId,
      buyerEmail: userEmail || buyerData.email || "",
      buyerName: userName || buyerData.displayName || buyerData.name || "",
      buyerUsername: buyerData.username || "",
      buyerProfilePicture: buyerData.profilePicture || "",
      buyerPlan: buyerData.plan || "free",
      buyerJoinedAt: buyerData.createdAt ? new Date(buyerData.createdAt.seconds * 1000).toISOString() : "",
    }

    console.log("📋 [Checkout] Buyer metadata prepared:", {
      buyerUid: buyerMetadata.buyerUid,
      buyerEmail: buyerMetadata.buyerEmail,
      buyerName: buyerMetadata.buyerName,
      buyerUsername: buyerMetadata.buyerUsername,
    })

    // Create checkout session on connected account
    console.log("💳 [Checkout] Creating Stripe checkout session...")
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: bundleData.title || "Digital Content Bundle",
                description: bundleData.description || "Premium digital content",
                images: bundleData.thumbnailUrl ? [bundleData.thumbnailUrl] : [],
                metadata: {
                  bundleId,
                  creatorId,
                  type: "bundle",
                },
              },
              unit_amount: Math.round((bundleData.price || 0) * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url:
          successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
        client_reference_id: userId, // Primary buyer identification
        customer_email: userEmail || buyerData.email,
        metadata: {
          bundleId,
          creatorId,
          itemType: "bundle",
          itemId: bundleId,
          // Buyer information in metadata
          ...buyerMetadata,
          // Additional context
          platform: "massclip",
          version: "2.0",
          createdAt: new Date().toISOString(),
        },
        payment_intent_data: {
          metadata: {
            bundleId,
            creatorId,
            itemType: "bundle",
            // Buyer information in payment intent metadata too
            ...buyerMetadata,
          },
        },
        // Enable automatic tax calculation if configured
        automatic_tax: {
          enabled: false, // Set to true if you have tax settings configured
        },
        // Collect billing address for tax purposes
        billing_address_collection: "auto",
        // Set custom fields if needed
        custom_fields: [],
        // Expire session after 24 hours
        expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      },
      {
        stripeAccount: connectedAccountId,
      },
    )

    console.log("✅ [Checkout] Session created successfully:", {
      sessionId: session.id,
      amount: session.amount_total,
      currency: session.currency,
      connectedAccount: connectedAccountId,
      buyerUid: userId,
      bundleId,
      creatorId,
    })

    // Log session creation for debugging
    console.log("📊 [Checkout] Session metadata:", session.metadata)
    console.log("📊 [Checkout] Client reference ID:", session.client_reference_id)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      connectedAccount: connectedAccountId,
      bundleTitle: bundleData.title,
      amount: session.amount_total,
      currency: session.currency,
      buyerUid: userId,
      metadata: session.metadata,
    })
  } catch (error: any) {
    console.error("❌ [Checkout] Session creation failed:", error)

    // Handle specific Stripe errors
    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        {
          error: "Invalid request to Stripe",
          details: error.message,
          code: error.code,
        },
        { status: 400 },
      )
    }

    if (error.type === "StripePermissionError") {
      return NextResponse.json(
        {
          error: "Stripe account access denied",
          details: "The connected Stripe account may be restricted or disconnected",
        },
        { status: 403 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error.message,
        type: error.name || "UnknownError",
      },
      { status: 500 },
    )
  }
}
