import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, isFirebaseAdminInitialized } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_TEST_2!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  console.log("🚀 [Download Checkout] Starting download purchase session creation...")

  if (!isFirebaseAdminInitialized()) {
    console.error("❌ [Download Checkout] CRITICAL: Firebase Admin SDK is not initialized.")
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { idToken, downloadId, priceId, downloads, price } = body
    console.log("📝 [Download Checkout] Request body received:", {
      downloadId,
      priceId,
      downloads,
      price,
      hasIdToken: !!idToken,
    })

    if (!idToken || !downloadId || !priceId || !downloads || !price) {
      console.error("❌ [Download Checkout] Missing required parameters.")
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 })
    }

    // --- Authenticate User ---
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Download Checkout] Firebase token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token." }, { status: 403 })
    }

    const { uid, email, name } = decodedToken
    console.log("✅ [Download Checkout] User authenticated:", { uid, email })

    // --- Construct Metadata ---
    const metadata = {
      buyerUid: uid,
      buyerEmail: email || "",
      buyerName: name || email?.split("@")[0] || "",
      downloadId,
      downloadCount: downloads.toString(),
      downloadPrice: price.toString(),
      contentType: "download_purchase",
      source: "dashboard_download_purchase",
    }
    console.log("📋 [Download Checkout] Constructed metadata for Stripe:", metadata)

    // --- Get Site URL for Redirects ---
    const host = request.headers.get("host")!
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
    const siteUrl = `${protocol}://${host}`

    // --- Create Stripe Checkout Session ---
    console.log("🔄 [Download Checkout] Creating Stripe session for download purchase...")
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment", // One-time payment, not subscription
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${siteUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}&type=downloads`,
      cancel_url: `${siteUrl}/dashboard/upgrade`,
      metadata: metadata,
    })

    console.log("✅ [Download Checkout] Stripe session created successfully!")
    console.log(`   - Session ID: ${session.id}`)
    console.log(`   - Downloads: ${downloads}`)
    console.log(`   - Checkout URL: ${session.url}`)

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      downloads: downloads,
    })
  } catch (error: any) {
    console.error("❌ [Download Checkout] An unexpected error occurred:", error)
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 })
  }
}
