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
    const { sessionId, idToken, buyerUid } = await request.json()

    console.log("🔍 [Verify Session] Starting verification:", {
      sessionId,
      buyerUid,
      hasIdToken: !!idToken,
    })

    // Validate required fields
    if (!sessionId || !idToken || !buyerUid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify Firebase token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
      console.log("✅ [Verify Session] Token verified for user:", decodedToken.uid)
    } catch (error: any) {
      console.error("❌ [Verify Session] Token verification failed:", error.message)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    // CRITICAL: Verify buyer UID matches token
    if (decodedToken.uid !== buyerUid) {
      console.error("❌ [Verify Session] Buyer UID mismatch:", {
        tokenUid: decodedToken.uid,
        providedBuyerUid: buyerUid,
      })
      return NextResponse.json({ error: "Authentication mismatch" }, { status: 403 })
    }

    // Retrieve Stripe session
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
      console.log("✅ [Verify Session] Stripe session retrieved:", session.id)
    } catch (error: any) {
      console.error("❌ [Verify Session] Failed to retrieve session:", error.message)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // CRITICAL: Verify buyer UID in session metadata
    const sessionBuyerUid = session.metadata?.buyerUid
    if (!sessionBuyerUid) {
      console.error("❌ [Verify Session] No buyer UID in session metadata")
      return NextResponse.json({ error: "Invalid session - no buyer identification" }, { status: 400 })
    }

    if (sessionBuyerUid !== buyerUid) {
      console.error("❌ [Verify Session] Session buyer UID mismatch:", {
        sessionBuyerUid,
        providedBuyerUid: buyerUid,
      })
      return NextResponse.json({ error: "Session buyer mismatch" }, { status: 403 })
    }

    // Verify payment was successful
    if (session.payment_status !== "paid") {
      console.error("❌ [Verify Session] Payment not completed:", session.payment_status)
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Check if purchase record exists
    const purchaseQuery = await db
      .collection("purchases")
      .where("sessionId", "==", sessionId)
      .where("buyerUid", "==", buyerUid) // CRITICAL: Also filter by buyer UID
      .limit(1)
      .get()

    if (purchaseQuery.empty) {
      console.warn("⚠️ [Verify Session] No purchase record found, creating one")

      // Create purchase record
      const purchaseData = {
        buyerUid,
        buyerEmail: decodedToken.email || session.customer_email,
        bundleId: session.metadata?.bundleId,
        sellerId: session.metadata?.sellerId,
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        amount: session.amount_total,
        currency: session.currency,
        status: "completed",
        createdAt: new Date(),
        metadata: session.metadata,
      }

      await db.collection("purchases").add(purchaseData)
      console.log("✅ [Verify Session] Purchase record created")
    }

    const purchaseDetails = {
      sessionId: session.id,
      buyerUid, // CRITICAL: Return verified buyer UID
      bundleId: session.metadata?.bundleId,
      sellerId: session.metadata?.sellerId,
      amount: session.amount_total,
      currency: session.currency,
      status: session.payment_status,
      paymentIntent: session.payment_intent,
    }

    console.log("✅ [Verify Session] Verification successful:", purchaseDetails)

    return NextResponse.json(purchaseDetails)
  } catch (error: any) {
    console.error("❌ [Verify Session] Unexpected error:", error.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
