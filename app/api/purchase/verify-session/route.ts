import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode, callStripeWithAccount } from "@/lib/stripe"
import { db, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, idToken } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log(`🔍 [Purchase Verify] Verifying session: ${sessionId} (${isTestMode ? "TEST" : "LIVE"} mode)`)

    let userId: string | null = null

    // If idToken is provided, verify it
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log(`✅ [Purchase Verify] Token verified for user: ${userId}`)
      } catch (tokenError) {
        console.error("❌ [Purchase Verify] Token verification failed:", tokenError)
        // Continue without user ID for anonymous purchases
      }
    }

    // First, try to retrieve session from platform account
    let session: any = null
    let connectedAccountId: string | null = null

    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      })
      console.log(`✅ [Purchase Verify] Retrieved session from platform account`)
    } catch (platformError: any) {
      console.log(`⚠️ [Purchase Verify] Session not found in platform account, checking metadata...`)

      // If we have metadata about the connected account, try that
      if (session?.metadata?.connectedAccountId) {
        connectedAccountId = session.metadata.connectedAccountId
        try {
          session = await callStripeWithAccount(connectedAccountId, (stripeWithAccount) =>
            stripeWithAccount.checkout.sessions.retrieve(sessionId, {
              expand: ["payment_intent"],
            }),
          )
          console.log(`✅ [Purchase Verify] Retrieved session from connected account: ${connectedAccountId}`)
        } catch (connectedError: any) {
          console.error(`❌ [Purchase Verify] Failed to retrieve from connected account:`, connectedError)
          return NextResponse.json({ error: "Session not found" }, { status: 404 })
        }
      } else {
        return NextResponse.json({ error: "Session not found" }, { status: 404 })
      }
    }

    // Validate session
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Extract metadata
    const productBoxId = session.metadata?.productBoxId
    const creatorId = session.metadata?.creatorId
    const buyerId = session.metadata?.buyerId || userId
    const sessionConnectedAccountId = session.metadata?.connectedAccountId

    if (!productBoxId || !creatorId) {
      return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 })
    }

    console.log(`📦 [Purchase Verify] Processing purchase:`, {
      productBoxId,
      creatorId,
      buyerId,
      connectedAccountId: sessionConnectedAccountId,
    })

    // Check if purchase already exists
    const existingPurchase = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

    if (!existingPurchase.empty) {
      console.log(`ℹ️ [Purchase Verify] Purchase already recorded for session: ${sessionId}`)
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        purchaseId: existingPurchase.docs[0].id,
      })
    }

    // Create purchase record
    const purchaseData = {
      sessionId,
      productBoxId,
      creatorId,
      buyerId: buyerId || "anonymous",
      amount: session.amount_total / 100,
      currency: session.currency,
      status: "completed",
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email || session.customer_email,
      connectedAccountId: sessionConnectedAccountId,
      environment: isTestMode ? "test" : "live",
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        paymentIntentId: session.payment_intent?.id,
        mode: session.mode,
        sessionMode: isTestMode ? "test" : "live",
      },
    }

    const purchaseRef = await db.collection("purchases").add(purchaseData)
    console.log(`✅ [Purchase Verify] Created purchase record: ${purchaseRef.id}`)

    // Grant access to the product box
    if (buyerId) {
      try {
        await db
          .collection("users")
          .doc(buyerId)
          .collection("purchases")
          .doc(purchaseRef.id)
          .set({
            productBoxId,
            creatorId,
            purchaseId: purchaseRef.id,
            sessionId,
            amount: purchaseData.amount,
            purchasedAt: new Date(),
            environment: isTestMode ? "test" : "live",
          })

        console.log(`✅ [Purchase Verify] Granted access to user: ${buyerId}`)
      } catch (accessError) {
        console.error(`❌ [Purchase Verify] Failed to grant access:`, accessError)
      }
    }

    return NextResponse.json({
      success: true,
      purchaseId: purchaseRef.id,
      productBoxId,
      creatorId,
      buyerId,
      amount: purchaseData.amount,
      environment: isTestMode ? "test" : "live",
      connectedAccountId: sessionConnectedAccountId,
    })
  } catch (error: any) {
    console.error("❌ [Purchase Verify] Verification error:", error)
    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
