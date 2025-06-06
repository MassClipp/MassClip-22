import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, productBoxId } = await request.json()

    if (!sessionId || !productBoxId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    console.log("🔍 [Purchase Verify] Verifying session:", sessionId)

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists()) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()!

    // Get creator's Stripe account
    const creatorDoc = await db.collection("users").doc(productBox.creatorId).get()
    if (!creatorDoc.exists()) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()!
    const stripeAccountId = creatorData.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({ error: "Creator's Stripe account not found" }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      stripeAccount: stripeAccountId,
    })

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Verify the session metadata matches
    if (session.metadata?.productBoxId !== productBoxId) {
      return NextResponse.json({ error: "Session does not match product" }, { status: 400 })
    }

    // Check if purchase record already exists
    const existingPurchase = await db
      .collection("purchases")
      .where("sessionId", "==", sessionId)
      .where("productBoxId", "==", productBoxId)
      .get()

    let purchaseData
    if (existingPurchase.empty) {
      // Create purchase record
      purchaseData = {
        sessionId,
        productBoxId,
        productTitle: productBox.title,
        creatorId: productBox.creatorId,
        creatorUsername: creatorData.username,
        amount: (session.amount_total || 0) / 100, // Convert from cents
        currency: session.currency || "usd",
        customerEmail: session.customer_details?.email,
        purchasedAt: new Date(),
        status: "completed",
        type: productBox.type,
        subscriptionId: session.subscription || null,
      }

      await db.collection("purchases").add(purchaseData)
      console.log("✅ [Purchase Verify] Created purchase record")
    } else {
      purchaseData = existingPurchase.docs[0].data()
      console.log("✅ [Purchase Verify] Found existing purchase record")
    }

    return NextResponse.json({
      success: true,
      purchase: {
        productBoxId,
        productTitle: productBox.title,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency || "usd",
        sessionId,
        creatorUsername: creatorData.username,
      },
    })
  } catch (error) {
    console.error("❌ [Purchase Verify] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
