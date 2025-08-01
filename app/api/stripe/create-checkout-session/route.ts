import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin, db, auth } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [Checkout] Starting checkout session creation...")

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    const body = await request.json()
    const { idToken, priceId, bundleId, successUrl, cancelUrl } = body

    console.log("📥 [Checkout] Request data:", {
      priceId,
      bundleId,
      successUrl,
      cancelUrl,
      hasIdToken: !!idToken,
      tokenLength: idToken?.length,
    })

    // Validate required fields
    if (!idToken) {
      console.error("❌ [Checkout] Missing idToken")
      return NextResponse.json({ error: "Authentication token required" }, { status: 401 })
    }

    if (!priceId || !bundleId) {
      console.error("❌ [Checkout] Missing required fields:", { priceId, bundleId })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify Firebase ID token
    console.log("🔐 [Checkout] Verifying Firebase ID token...")
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Checkout] Token verified for user:", {
        uid: decodedToken.uid,
        email: decodedToken.email,
      })
    } catch (error) {
      console.error("❌ [Checkout] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const buyerUid = decodedToken.uid
    const buyerEmail = decodedToken.email

    // Get or create buyer profile
    console.log("👤 [Checkout] Getting buyer profile...")
    let buyerProfile
    try {
      const userDoc = await db.collection("users").doc(buyerUid).get()
      if (userDoc.exists) {
        buyerProfile = userDoc.data()
        console.log("✅ [Checkout] Found existing buyer profile")
      } else {
        // Create minimal profile
        buyerProfile = {
          uid: buyerUid,
          email: buyerEmail,
          displayName: decodedToken.name || buyerEmail?.split("@")[0] || "User",
          createdAt: new Date(),
        }
        await db.collection("users").doc(buyerUid).set(buyerProfile)
        console.log("✅ [Checkout] Created new buyer profile")
      }
    } catch (error) {
      console.error("❌ [Checkout] Error handling buyer profile:", error)
      return NextResponse.json({ error: "Failed to process buyer profile" }, { status: 500 })
    }

    // Get bundle information
    console.log("📦 [Checkout] Getting bundle information...")
    let bundleData
    try {
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()
      if (!bundleDoc.exists) {
        console.error("❌ [Checkout] Bundle not found:", bundleId)
        return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
      }
      bundleData = bundleDoc.data()
      console.log("✅ [Checkout] Bundle found:", {
        title: bundleData?.title,
        price: bundleData?.price,
        creatorId: bundleData?.creatorId,
      })
    } catch (error) {
      console.error("❌ [Checkout] Error fetching bundle:", error)
      return NextResponse.json({ error: "Failed to fetch bundle" }, { status: 500 })
    }

    // Create Stripe checkout session
    console.log("💳 [Checkout] Creating Stripe checkout session...")
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: buyerEmail,
        metadata: {
          bundleId,
          buyerUid,
          buyerEmail: buyerEmail || "",
          creatorId: bundleData?.creatorId || "",
          bundleTitle: bundleData?.title || "",
          purchaseType: "bundle",
        },
        payment_intent_data: {
          metadata: {
            bundleId,
            buyerUid,
            buyerEmail: buyerEmail || "",
            creatorId: bundleData?.creatorId || "",
            bundleTitle: bundleData?.title || "",
            purchaseType: "bundle",
          },
        },
      })

      console.log("✅ [Checkout] Stripe session created:", {
        sessionId: session.id,
        url: session.url,
        buyerUid,
        bundleId,
      })

      return NextResponse.json({
        sessionId: session.id,
        url: session.url,
        buyerUid,
        bundleId,
        message: "Checkout session created successfully",
      })
    } catch (error) {
      console.error("❌ [Checkout] Stripe session creation failed:", error)
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ [Checkout] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
