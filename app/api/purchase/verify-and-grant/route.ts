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

    console.log(`🔍 [Purchase Verification] Verifying session: ${sessionId}`)

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "payment_intent"],
    })

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Extract product information from metadata
    const bundleId = session.metadata?.bundleId || session.metadata?.productBoxId
    const bundleTitle = session.metadata?.bundleTitle || "Unknown Bundle"
    const creatorUsername = session.metadata?.creatorUsername || "Unknown Creator"
    const price = session.amount_total ? session.amount_total / 100 : 0

    if (!bundleId) {
      console.error("❌ [Purchase Verification] No bundle ID found in session metadata")
      return NextResponse.json({ error: "Invalid purchase session" }, { status: 400 })
    }

    // Generate access token for anonymous access
    const accessToken = `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create purchase record
    const purchaseData = {
      sessionId,
      bundleId,
      productBoxId: bundleId, // For compatibility
      bundleTitle,
      creatorUsername,
      price,
      currency: session.currency || "usd",
      purchaseDate: new Date(),
      status: "completed",
      accessToken,
      customerEmail: session.customer_details?.email,
      paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
    }

    // Try to fetch bundle/product details to enrich the purchase
    try {
      const bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
      if (bundleDoc.exists) {
        const bundleData = bundleDoc.data()
        purchaseData.bundleTitle = bundleData?.title || purchaseData.bundleTitle
        purchaseData.bundleDescription = bundleData?.description
        purchaseData.thumbnailUrl = bundleData?.customPreviewThumbnail || bundleData?.thumbnailUrl
        purchaseData.totalItems = bundleData?.totalItems || 0
        purchaseData.totalSize = bundleData?.totalSize || 0

        // Fetch content items
        const contentQuery = await db.collection("productBoxContent").where("productBoxId", "==", bundleId).get()

        const contentItems: any[] = []
        contentQuery.forEach((doc) => {
          const data = doc.data()
          contentItems.push({
            id: doc.id,
            title: data.title || data.filename || "Untitled",
            fileUrl: data.fileUrl,
            mimeType: data.mimeType,
            fileSize: data.fileSize || 0,
            contentType: data.mimeType?.startsWith("video/")
              ? "video"
              : data.mimeType?.startsWith("audio/")
                ? "audio"
                : data.mimeType?.startsWith("image/")
                  ? "image"
                  : "document",
            duration: data.duration,
            filename: data.filename,
          })
        })

        purchaseData.contentItems = contentItems
        purchaseData.totalItems = contentItems.length
        purchaseData.totalSize = contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)
      }
    } catch (bundleError) {
      console.warn("⚠️ [Purchase Verification] Could not fetch bundle details:", bundleError)
    }

    // Store in both regular and anonymous purchases collections
    const purchaseRef = await db.collection("purchases").add(purchaseData)
    await db.collection("anonymousPurchases").add({
      ...purchaseData,
      originalPurchaseId: purchaseRef.id,
    })

    console.log(`✅ [Purchase Verification] Purchase recorded with ID: ${purchaseRef.id}`)

    // Create response with secure cookie
    const response = NextResponse.json({
      success: true,
      purchaseId: purchaseRef.id,
      accessToken,
      bundleId,
      bundleTitle,
    })

    // Set secure cookie for anonymous access
    response.cookies.set(`purchase_access_${bundleId}`, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
      path: "/",
    })

    return response
  } catch (error) {
    console.error("❌ [Purchase Verification] Error:", error)
    return NextResponse.json({ error: "Failed to verify purchase" }, { status: 500 })
  }
}
