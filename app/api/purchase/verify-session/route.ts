import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode, retrieveSessionWithAccount } from "@/lib/stripe"
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
      } catch (error) {
        console.error("❌ [Purchase Verify] Token verification failed:", error)
        // Continue without user ID for anonymous purchases
      }
    }

    // Try to retrieve session with connected account context first
    let session: any = null
    let connectedAccountId: string | null = null

    try {
      // First, try to get session from platform account to read metadata
      const platformSession = await stripe.checkout.sessions.retrieve(sessionId)
      connectedAccountId = platformSession.metadata?.connectedAccountId || null

      if (connectedAccountId) {
        console.log(`🔍 [Purchase Verify] Retrieving session from connected account: ${connectedAccountId}`)
        session = await retrieveSessionWithAccount(sessionId, connectedAccountId)
      } else {
        console.log(`🔍 [Purchase Verify] No connected account, using platform session`)
        session = platformSession
      }
    } catch (error: any) {
      console.error("❌ [Purchase Verify] Session retrieval failed:", error)
      return NextResponse.json({ error: "Session not found or invalid" }, { status: 404 })
    }

    if (session.payment_status !== "paid") {
      console.log(`⚠️ [Purchase Verify] Session ${sessionId} payment not completed: ${session.payment_status}`)
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Extract purchase details
    const productBoxId = session.metadata?.productBoxId
    const sessionUserId = session.metadata?.userId
    const creatorId = session.metadata?.creatorId
    const customerEmail = session.customer_details?.email

    if (!productBoxId) {
      return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 })
    }

    // Use session user ID if no token provided
    const finalUserId = userId || sessionUserId

    console.log(`💰 [Purchase Verify] Processing purchase:`, {
      sessionId,
      productBoxId,
      userId: finalUserId,
      creatorId,
      customerEmail,
      connectedAccountId,
    })

    // Record the purchase
    const purchaseData = {
      sessionId,
      productBoxId,
      userId: finalUserId,
      creatorId,
      customerEmail,
      connectedAccountId,
      amount: session.amount_total,
      currency: session.currency,
      paymentStatus: session.payment_status,
      mode: isTestMode ? "test" : "live",
      createdAt: new Date(),
      stripeSessionId: sessionId,
      environment: isTestMode ? "test" : "live",
    }

    // Save to purchases collection
    await db.collection("purchases").add(purchaseData)

    // If user is authenticated, also save to user's purchases
    if (finalUserId) {
      await db
        .collection("users")
        .doc(finalUserId)
        .collection("purchases")
        .add({
          ...purchaseData,
          grantedAt: new Date(),
        })
    }

    console.log(`✅ [Purchase Verify] Purchase recorded successfully for session: ${sessionId}`)

    return NextResponse.json({
      success: true,
      purchase: {
        sessionId,
        productBoxId,
        userId: finalUserId,
        amount: session.amount_total,
        currency: session.currency,
        connectedAccountId,
        mode: isTestMode ? "test" : "live",
      },
    })
  } catch (error: any) {
    console.error("❌ [Purchase Verify] Verification failed:", error)
    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
