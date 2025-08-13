import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, isFirebaseAdminInitialized } from "@/lib/firebase-admin"

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

// Fallback Price ID for testing if the environment variable is not set
const FALLBACK_TEST_PRICE_ID = "price_1P0jL4H6aJg9jZ4Y6yZ4jZ4Y" // Replace with a valid test price ID if needed

export async function POST(request: NextRequest) {
  console.log("🚀 [Membership Checkout] Starting session creation...")

  if (!isFirebaseAdminInitialized()) {
    console.error("❌ [Membership Checkout] CRITICAL: Firebase Admin SDK is not initialized.")
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { idToken, overridePriceId } = body
    console.log("📝 [Membership Checkout] Request body received:", { hasIdToken: !!idToken, overridePriceId })

    if (!idToken) {
      console.error("❌ [Membership Checkout] Authentication error: Missing idToken.")
      return NextResponse.json({ error: "User not authenticated." }, { status: 401 })
    }

    // --- Authenticate User ---
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Membership Checkout] Firebase token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token." }, { status: 403 })
    }

    const { uid, email, name } = decodedToken
    console.log("✅ [Membership Checkout] User authenticated:", { uid, email })

    // --- Determine Stripe Price ID ---
    const priceId = overridePriceId || process.env.STRIPE_PRICE_ID || FALLBACK_TEST_PRICE_ID
    if (!priceId) {
      console.error("❌ [Membership Checkout] Configuration error: Missing Stripe Price ID.")
      return NextResponse.json({ error: "Stripe Price ID is not configured." }, { status: 500 })
    }
    console.log(`💲 [Membership Checkout] Using Stripe Price ID: ${priceId}`)

    // --- Construct Metadata ---
    // This metadata is CRITICAL for the webhook to identify the user
    const metadata = {
      buyerUid: uid, // The most important piece of data
      buyerEmail: email || "",
      buyerName: name || email?.split("@")[0] || "",
      plan: "creator_pro",
      contentType: "membership", // Differentiates from bundle purchases
      source: "dashboard_membership_upgrade",
      userId: uid, // Backup field
    }
    console.log("📋 [Membership Checkout] Constructed metadata for Stripe:", metadata)

    // --- Get Site URL for Redirects ---
    const host = request.headers.get("host")!
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
    const siteUrl = `${protocol}://${host}`

    // --- Create Stripe Checkout Session ---
    console.log("🔄 [Membership Checkout] Creating Stripe session on PLATFORM account...")
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Use the authenticated user's email
      customer_email: email,
      // Set the user ID as client reference for backup identification
      client_reference_id: uid,
      // Set success and cancel URLs
      success_url: `${siteUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard`,
      // Attach the critical metadata
      metadata: metadata,
      // Also attach metadata to the subscription for easier debugging
      subscription_data: {
        metadata: metadata,
      },
    })

    console.log("✅ [Membership Checkout] Stripe session created successfully!")
    console.log(`   - Session ID: ${session.id}`)
    console.log(`   - Checkout URL: ${session.url}`)

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error("❌ [Membership Checkout] An unexpected error occurred:", error)
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 })
  }
}
