import { type NextRequest, NextResponse } from "next/server"
import { stripe, isTestMode, retrieveSessionWithAccount } from "@/lib/stripe"
import { db, auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, idToken } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Verify the Firebase ID token if provided
    let userId = null
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log(`✅ [Purchase Verify] Token verified for user: ${userId}`)
      } catch (tokenError) {
        console.error("❌ [Purchase Verify] Token verification failed:", tokenError)
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
      }
    }

    console.log(`🔍 [Purchase Verify] Verifying session: ${sessionId}`)

    // Try to retrieve the session
    let session
    let connectedAccountId = null

    try {
      // First try to retrieve from platform account
      session = await stripe.checkout.sessions.retrieve(sessionId)
      console.log(`✅ [Purchase Verify] Session retrieved from platform account`)
    } catch (platformError: any) {
      console.log(`⚠️ [Purchase Verify] Platform retrieval failed, trying connected accounts...`)

      // If session not found on platform, try to find it via connected account
      // This requires checking the metadata or user's connected account
      if (userId) {
        const userDoc = await db.collection("users").doc(userId).get()
        if (userDoc.exists) {
          const userData = userDoc.data()!
          connectedAccountId = isTestMode ? userData.stripeTestAccountId : userData.stripeAccountId

          if (connectedAccountId) {
            try {
              session = await retrieveSessionWithAccount(sessionId, connectedAccountId)
              console.log(`✅ [Purchase Verify] Session retrieved from connected account: ${connectedAccountId}`)
            } catch (connectedError: any) {
              console.error("❌ [Purchase Verify] Connected account retrieval failed:", connectedError)
            }
          }
        }
      }

      if (!session) {
        console.error("❌ [Purchase Verify] Session not found in any account")
        return NextResponse.json({ error: "Session not found" }, { status: 404 })
      }
    }

    // Validate session
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        {
          error: "Payment not completed",
          status: session.payment_status,
        },
        { status: 400 },
      )
    }

    // Extract metadata
    const metadata = session.metadata || {}
    const productBoxId = metadata.productBoxId
    const sessionUserId = metadata.userId
    const sessionConnectedAccountId = metadata.connectedAccountId

    if (!productBoxId) {
      return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 })
    }

    // Verify user matches if token provided
    if (userId && sessionUserId && userId !== sessionUserId) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 })
    }

    console.log(`✅ [Purchase Verify] Session verified:`, {
      sessionId: session.id,
      productBoxId,
      userId: sessionUserId,
      connectedAccountId: sessionConnectedAccountId || connectedAccountId,
      amount: session.amount_total,
      mode: isTestMode ? "test" : "live",
    })

    // Record the purchase in Firestore
    const purchaseData = {
      sessionId: session.id,
      productBoxId,
      userId: sessionUserId || userId,
      amount: session.amount_total,
      currency: session.currency,
      paymentStatus: session.payment_status,
      connectedAccountId: sessionConnectedAccountId || connectedAccountId,
      customerEmail: session.customer_details?.email,
      createdAt: new Date(),
      environment: isTestMode ? "test" : "live",
      verifiedAt: new Date(),
    }

    // Save to purchases collection
    await db.collection("purchases").add(purchaseData)

    // Grant access to the product box content
    if (sessionUserId || userId) {
      const accessData = {
        userId: sessionUserId || userId,
        productBoxId,
        grantedAt: new Date(),
        sessionId: session.id,
        purchaseAmount: session.amount_total,
        environment: isTestMode ? "test" : "live",
      }

      await db.collection("userAccess").add(accessData)
      console.log(`✅ [Purchase Verify] Access granted to user: ${sessionUserId || userId}`)
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        amount: session.amount_total,
        currency: session.currency,
        status: session.payment_status,
      },
      purchase: {
        productBoxId,
        userId: sessionUserId || userId,
        connectedAccountId: sessionConnectedAccountId || connectedAccountId,
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
