import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Session ID is required",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 [Verify Session] Verifying session: ${sessionId} for user: ${userId}`)

    // First, try to retrieve the session from Stripe
    let session: any
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
      console.log(`✅ [Verify Session] Found session in Stripe: ${session.id}`)
    } catch (error: any) {
      console.error(`❌ [Verify Session] Session not found in Stripe:`, error.message)
      return NextResponse.json(
        {
          success: false,
          error: "Session not found in Stripe",
          details: error.message,
        },
        { status: 404 },
      )
    }

    // Check if session was successful
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        {
          success: false,
          error: "Payment not completed",
          paymentStatus: session.payment_status,
        },
        { status: 400 },
      )
    }

    // Extract metadata
    const { productBoxId, buyerUid } = session.metadata || {}
    const actualUserId = userId || buyerUid

    if (!productBoxId || !actualUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required metadata",
          metadata: session.metadata,
        },
        { status: 400 },
      )
    }

    // Check if purchase already exists
    const existingPurchase = await UnifiedPurchaseService.getUserPurchase(actualUserId, sessionId)
    if (existingPurchase) {
      console.log(`✅ [Verify Session] Purchase already exists for session: ${sessionId}`)
      return NextResponse.json({
        success: true,
        message: "Purchase already verified",
        purchase: existingPurchase,
      })
    }

    // Create the purchase record
    try {
      await UnifiedPurchaseService.createUnifiedPurchase(actualUserId, {
        productBoxId,
        sessionId: session.id,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        creatorId: session.metadata?.creatorUid || "",
      })

      console.log(`✅ [Verify Session] Successfully created purchase record for session: ${sessionId}`)

      return NextResponse.json({
        success: true,
        message: "Purchase verified and recorded",
        sessionId: session.id,
        productBoxId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
      })
    } catch (error: any) {
      console.error(`❌ [Verify Session] Failed to create purchase record:`, error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create purchase record",
          details: error.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ [Verify Session] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Verification failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
