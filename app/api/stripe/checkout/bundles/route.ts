import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, isFirebaseAdminInitialized } from "@/lib/firebase-admin"
import { createBundleSlotPurchase, BUNDLE_SLOT_TIERS } from "@/lib/bundle-slots-service"

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  console.log("🚀 [Bundle Checkout] Starting bundle purchase session creation...")

  if (!isFirebaseAdminInitialized()) {
    console.error("❌ [Bundle Checkout] CRITICAL: Firebase Admin SDK is not initialized.")
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { idToken, bundleId, priceId, bundles, price } = body
    console.log("📝 [Bundle Checkout] Request body received:", {
      bundleId,
      priceId,
      bundles,
      price,
      hasIdToken: !!idToken,
    })

    if (!idToken || !bundleId || !priceId || !bundles || !price) {
      console.error("❌ [Bundle Checkout] Missing required parameters.")
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 })
    }

    // --- Authenticate User ---
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Bundle Checkout] Firebase token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token." }, { status: 403 })
    }

    const { uid, email, name } = decodedToken
    console.log("✅ [Bundle Checkout] User authenticated:", { uid, email })

    const bundleSlotTier = Object.entries(BUNDLE_SLOT_TIERS).find(([_, tier]) => tier.priceId === priceId)

    if (!bundleSlotTier) {
      console.error("❌ [Bundle Checkout] Invalid price ID for bundle slots:", priceId)
      return NextResponse.json({ error: "Invalid bundle slot tier." }, { status: 400 })
    }

    const [tierKey, tierInfo] = bundleSlotTier
    console.log("✅ [Bundle Checkout] Bundle slot tier validated:", {
      tierKey,
      slots: tierInfo.slots,
      amount: tierInfo.amount,
    })

    // --- Construct Metadata ---
    const metadata = {
      buyerUid: uid,
      buyerEmail: email || "",
      buyerName: name || email?.split("@")[0] || "",
      bundleId,
      bundleCount: bundles.toString(),
      bundlePrice: price.toString(),
      bundleSlots: tierInfo.slots.toString(),
      bundleTier: tierKey,
      contentType: "bundle_slot_purchase",
      source: "dashboard_bundle_slot_purchase",
    }
    console.log("📋 [Bundle Checkout] Constructed metadata for Stripe:", metadata)

    // --- Get Site URL for Redirects ---
    const host = request.headers.get("host")!
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
    const siteUrl = `${protocol}://${host}`

    // --- Create Stripe Checkout Session ---
    console.log("🔄 [Bundle Checkout] Creating Stripe session for bundle slot purchase...")
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
      success_url: `${siteUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}&type=bundle_slots`,
      cancel_url: `${siteUrl}/dashboard/pricing`,
      metadata: metadata,
    })

    const purchaseId = await createBundleSlotPurchase(
      uid,
      email || "",
      tierKey as keyof typeof BUNDLE_SLOT_TIERS,
      session.id,
    )

    console.log("✅ [Bundle Checkout] Stripe session and purchase record created successfully!")
    console.log(`   - Session ID: ${session.id}`)
    console.log(`   - Purchase ID: ${purchaseId}`)
    console.log(`   - Bundle Slots: ${tierInfo.slots}`)
    console.log(`   - Checkout URL: ${session.url}`)

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      purchaseId,
      bundleSlots: tierInfo.slots,
    })
  } catch (error: any) {
    console.error("❌ [Bundle Checkout] An unexpected error occurred:", error)
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 })
  }
}
