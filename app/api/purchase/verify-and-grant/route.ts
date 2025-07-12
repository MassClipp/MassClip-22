import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, productBoxId, creatorId } = await request.json()

    console.log(`🔄 [Verify and Grant] Processing request:`, {
      sessionId,
      productBoxId,
      creatorId,
    })

    if (!sessionId && !productBoxId) {
      return NextResponse.json({ error: "Missing session ID or product box ID" }, { status: 400 })
    }

    let purchaseData: any = null
    let stripeSession: any = null

    // If we have a session ID, verify with Stripe
    if (sessionId) {
      try {
        stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["line_items", "payment_intent"],
        })

        console.log(`✅ [Verify and Grant] Stripe session retrieved:`, {
          id: stripeSession.id,
          status: stripeSession.status,
          payment_status: stripeSession.payment_status,
          amount_total: stripeSession.amount_total,
        })

        if (stripeSession.payment_status !== "paid") {
          return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
        }
      } catch (error) {
        console.error(`❌ [Verify and Grant] Stripe session error:`, error)
        return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
      }
    }

    // Get product box details
    const productBoxDoc = await db.collection("bundles").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log(`📦 [Verify and Grant] Product box found:`, {
      id: productBoxId,
      title: productBoxData.title,
      creatorId: productBoxData.creatorId,
    })

    // Get creator details
    const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
    const creatorData = creatorDoc.exists ? creatorDoc.data() : null

    // Generate access token
    const accessToken = `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Prepare purchase data
    purchaseData = {
      id: sessionId || `purchase_${Date.now()}`,
      productBoxId,
      productBoxTitle: productBoxData.title || "Untitled Bundle",
      productBoxDescription: productBoxData.description || "Premium content bundle",
      productBoxThumbnail: productBoxData.customPreviewThumbnail || productBoxData.thumbnailUrl,
      creatorId: productBoxData.creatorId,
      creatorName: creatorData?.displayName || creatorData?.username || "Unknown Creator",
      creatorUsername: creatorData?.username || "unknown",
      amount: stripeSession ? stripeSession.amount_total / 100 : 0,
      currency: stripeSession ? stripeSession.currency : "usd",
      items: productBoxData.contents || [],
      totalItems: productBoxData.contentCount || 0,
      totalSize: productBoxData.totalSize || 0,
      purchasedAt: new Date().toISOString(),
      status: "completed",
      accessToken,
      sessionId,
      stripePaymentIntentId: stripeSession?.payment_intent?.id,
    }

    // Store in anonymousPurchases collection for guest access
    await db.collection("anonymousPurchases").add({
      ...purchaseData,
      createdAt: new Date().toISOString(),
      source: "stripe_checkout",
    })

    // Also store in bundlePurchases for consistency
    await db.collection("bundlePurchases").add({
      bundleId: productBoxId,
      bundleTitle: productBoxData.title,
      description: productBoxData.description,
      thumbnailUrl: productBoxData.customPreviewThumbnail || productBoxData.thumbnailUrl,
      creatorId: productBoxData.creatorId,
      amount: purchaseData.amount,
      currency: purchaseData.currency,
      contents: productBoxData.contents || [],
      contentCount: productBoxData.contentCount || 0,
      totalSize: productBoxData.totalSize || 0,
      status: "completed",
      accessToken,
      sessionId,
      stripePaymentIntentId: stripeSession?.payment_intent?.id,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      source: "stripe_checkout",
    })

    console.log(`✅ [Verify and Grant] Purchase records created with access token: ${accessToken}`)

    // Set access token as HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      purchase: purchaseData,
      message: "Access granted successfully",
    })

    // Set secure cookie for access token
    response.cookies.set(`purchase_access_${productBoxId}`, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
      path: "/",
    })

    return response
  } catch (error: any) {
    console.error(`❌ [Verify and Grant] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to verify purchase and grant access",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
