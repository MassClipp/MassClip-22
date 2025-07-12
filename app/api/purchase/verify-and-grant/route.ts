import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "payment_intent"],
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Get product box ID from metadata
    const productBoxId = session.metadata?.productBoxId

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID not found in session" }, { status: 400 })
    }

    // Get product box details
    const productBoxRef = db.collection("productBoxes").doc(productBoxId)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()

    // Generate access token
    const accessToken = `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create anonymous purchase record
    const anonymousPurchaseData = {
      sessionId,
      productBoxId,
      accessToken,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      purchasedAt: new Date().toISOString(),
      paymentIntentId: session.payment_intent?.id,
      customerEmail: session.customer_details?.email,
      status: "completed",
    }

    await db.collection("anonymousPurchases").add(anonymousPurchaseData)

    // Also create regular purchase record if user ID is available
    if (session.metadata?.userId) {
      const purchaseData = {
        userId: session.metadata.userId,
        productBoxId,
        sessionId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        purchasedAt: new Date().toISOString(),
        paymentIntentId: session.payment_intent?.id,
        status: "completed",
      }

      await db.collection("purchases").add(purchaseData)
    }

    // Set access token cookie
    const response = NextResponse.json({
      success: true,
      accessToken,
      productBoxId,
      productBoxTitle: productBoxData.title,
    })

    response.cookies.set("purchase_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })

    return response
  } catch (error) {
    console.error("Error verifying purchase:", error)
    return NextResponse.json({ error: "Failed to verify purchase" }, { status: 500 })
  }
}
