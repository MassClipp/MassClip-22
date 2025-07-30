import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-server"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      console.log("[Purchase Verification] No session ID provided")
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("[Purchase Verification] Starting verification for session:", sessionId)

    // Get the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "payment_intent"],
    })

    console.log("[Purchase Verification] Session retrieved:", {
      id: session.id,
      status: session.payment_status,
      metadata: session.metadata,
    })

    if (session.payment_status !== "paid") {
      console.log("[Purchase Verification] Session not paid:", session.payment_status)
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Get bundle ID from session metadata
    const bundleId = session.metadata?.bundleId
    if (!bundleId) {
      console.log("[Purchase Verification] No bundle ID in session metadata")
      return NextResponse.json({ error: "Bundle ID not found in session" }, { status: 400 })
    }

    console.log("[Purchase Verification] Bundle ID from metadata:", bundleId)

    // Check if already processed
    const existingPurchase = await db.collection("unifiedPurchases").where("sessionId", "==", sessionId).limit(1).get()

    if (!existingPurchase.empty) {
      console.log("[Purchase Verification] Purchase already processed")
      const purchaseData = existingPurchase.docs[0].data()
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        purchase: purchaseData,
      })
    }

    // Get bundle data
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.log("[Purchase Verification] Bundle not found:", bundleId)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()
    console.log("[Purchase Verification] Bundle found:", {
      id: bundleId,
      title: bundleData?.title,
      creatorId: bundleData?.creatorId,
    })

    // Get user info from session
    const customerEmail = session.customer_details?.email || session.metadata?.userEmail
    const userId = session.metadata?.userId || null

    console.log("[Purchase Verification] User info:", {
      userId,
      customerEmail,
      sessionId,
    })

    // Create purchase records
    const purchaseData = {
      sessionId,
      bundleId,
      userId,
      customerEmail,
      type: "bundle",
      status: "completed",
      amount: session.amount_total,
      currency: session.currency,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      bundleData: {
        title: bundleData?.title,
        description: bundleData?.description,
        creatorId: bundleData?.creatorId,
        thumbnailUrl: bundleData?.thumbnailUrl,
        contentItems: bundleData?.contentItems || [],
      },
    }

    // Create purchase in multiple collections for compatibility
    const batch = db.batch()

    // Main unified purchases collection
    const unifiedPurchaseRef = db.collection("unifiedPurchases").doc()
    batch.set(unifiedPurchaseRef, purchaseData)

    // Bundle purchases collection
    const bundlePurchaseRef = db.collection("bundlePurchases").doc()
    batch.set(bundlePurchaseRef, {
      ...purchaseData,
      bundleId,
      purchaseId: unifiedPurchaseRef.id,
    })

    // Legacy purchases collection
    const legacyPurchaseRef = db.collection("purchases").doc()
    batch.set(legacyPurchaseRef, {
      ...purchaseData,
      itemId: bundleId,
      itemType: "bundle",
    })

    // If user is authenticated, add to user's purchases subcollection
    if (userId) {
      const userPurchaseRef = db.collection("users").doc(userId).collection("purchases").doc()
      batch.set(userPurchaseRef, {
        ...purchaseData,
        purchaseId: unifiedPurchaseRef.id,
      })
    }

    await batch.commit()

    console.log("[Purchase Verification] Purchase records created successfully")

    return NextResponse.json({
      success: true,
      alreadyProcessed: false,
      purchase: {
        ...purchaseData,
        id: unifiedPurchaseRef.id,
      },
    })
  } catch (error) {
    console.error("[Purchase Verification] Error:", error)
    return NextResponse.json({ error: "Failed to verify purchase" }, { status: 500 })
  }
}
