import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeApp, getApps, cert } from "firebase-admin/app"
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

const db = getFirestore()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, expectedBuyerUid } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required", details: "Missing sessionId parameter" },
        { status: 400 },
      )
    }

    console.log("🔍 Verifying purchase session:", sessionId)

    // Retrieve session from Stripe
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
      console.log("✅ Session retrieved from Stripe")
    } catch (error: any) {
      console.error("❌ Failed to retrieve session from Stripe:", error.message)
      return NextResponse.json({ error: "Invalid session", details: error.message }, { status: 404 })
    }

    // Validate session is completed
    if (session.payment_status !== "paid") {
      console.error("❌ Session not paid:", session.payment_status)
      return NextResponse.json(
        { error: "Payment not completed", details: `Payment status: ${session.payment_status}` },
        { status: 400 },
      )
    }

    // CRITICAL: Validate buyer UID
    const buyerUid = session.metadata?.buyerUid
    if (!buyerUid) {
      console.error("🚨 CRITICAL: Session has no buyer UID:", sessionId)
      return NextResponse.json(
        { error: "Anonymous purchase detected", details: "Session missing buyer identification" },
        { status: 400 },
      )
    }

    // Verify buyer UID matches expected user
    if (expectedBuyerUid && buyerUid !== expectedBuyerUid) {
      console.error("❌ Buyer UID mismatch:", {
        sessionBuyerUid: buyerUid,
        expectedBuyerUid,
      })
      return NextResponse.json(
        { error: "Unauthorized access", details: "Purchase belongs to different user" },
        { status: 403 },
      )
    }

    // Verify buyer exists in database
    try {
      const buyerDoc = await db.collection("users").doc(buyerUid).get()
      if (!buyerDoc.exists) {
        console.error("❌ Buyer not found in database:", buyerUid)
        return NextResponse.json({ error: "Invalid buyer", details: "Buyer not found in database" }, { status: 404 })
      }
    } catch (error: any) {
      console.error("❌ Error verifying buyer:", error.message)
      return NextResponse.json({ error: "Buyer verification failed", details: error.message }, { status: 500 })
    }

    // Check if purchase record exists
    let purchaseRecord
    try {
      const purchaseQuery = await db
        .collection("purchases")
        .where("sessionId", "==", sessionId)
        .where("buyerUid", "==", buyerUid)
        .limit(1)
        .get()

      if (!purchaseQuery.empty) {
        purchaseRecord = purchaseQuery.docs[0].data()
        console.log("✅ Purchase record found")
      } else {
        console.warn("⚠️ Purchase record not found, may still be processing")
      }
    } catch (error: any) {
      console.error("❌ Error checking purchase record:", error.message)
    }

    const bundleId = session.metadata?.bundleId
    const sellerId = session.metadata?.sellerId

    console.log("✅ Purchase verification successful:", {
      sessionId,
      buyerUid,
      bundleId,
      sellerId,
    })

    return NextResponse.json({
      success: true,
      sessionId,
      buyerUid,
      bundleId,
      sellerId,
      amount: session.amount_total,
      currency: session.currency,
      paymentStatus: session.payment_status,
      purchaseRecord: purchaseRecord ? "found" : "processing",
      metadata: session.metadata,
    })
  } catch (error: any) {
    console.error("❌ Purchase verification error:", error.message)
    return NextResponse.json({ error: "Verification failed", details: error.message }, { status: 500 })
  }
}
