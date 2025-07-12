import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"
import { v4 as uuidv4 } from "uuid"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "payment_intent"],
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Extract product box ID from metadata
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

    const productBoxData = productBoxDoc.data()!

    // Get creator details
    let creatorData = { name: "Unknown Creator", username: "unknown" }
    if (productBoxData.creatorId) {
      try {
        const creatorRef = db.collection("users").doc(productBoxData.creatorId)
        const creatorDoc = await creatorRef.get()
        if (creatorDoc.exists) {
          const creator = creatorDoc.data()!
          creatorData = {
            name: creator.displayName || creator.name || "Unknown Creator",
            username: creator.username || "unknown",
          }
        }
      } catch (error) {
        console.error("Error fetching creator:", error)
      }
    }

    // Get content items
    let contentItems: any[] = []
    let totalSize = 0

    try {
      const contentRef = db.collection("productBoxes").doc(productBoxId).collection("content")
      const contentSnapshot = await contentRef.get()

      contentItems = contentSnapshot.docs.map((doc) => {
        const data = doc.data()
        totalSize += data.fileSize || 0
        return {
          id: doc.id,
          title: data.title || "Untitled",
          fileUrl: data.fileUrl || "",
          thumbnailUrl: data.thumbnailUrl || "",
          fileSize: data.fileSize || 0,
          duration: data.duration || 0,
          contentType: data.contentType || "document",
        }
      })
    } catch (error) {
      console.error("Error fetching content items:", error)
    }

    // Generate access token
    const accessToken = uuidv4()

    // Create purchase record
    const purchaseData = {
      sessionId: sessionId,
      productBoxId: productBoxId,
      productBoxTitle: productBoxData.title || "Untitled Product",
      productBoxDescription: productBoxData.description || "",
      productBoxThumbnail: productBoxData.thumbnailUrl || "",
      creatorId: productBoxData.creatorId || "",
      creatorName: creatorData.name,
      creatorUsername: creatorData.username,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      items: contentItems,
      totalItems: contentItems.length,
      totalSize: totalSize,
      purchasedAt: new Date(),
      status: "completed",
      accessToken: accessToken,
      paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      customerEmail: session.customer_details?.email || "",
      source: "stripe_checkout",
    }

    // Store in anonymous purchases collection
    const anonymousPurchaseRef = db.collection("anonymousPurchases").doc()
    await anonymousPurchaseRef.set(purchaseData)

    // Set secure cookie for access
    const response = NextResponse.json({
      success: true,
      purchaseId: anonymousPurchaseRef.id,
      accessToken: accessToken,
      productBoxId: productBoxId,
      message: "Purchase verified and access granted",
    })

    // Set secure cookie that expires in 1 year
    response.cookies.set(`purchase_access_${productBoxId}`, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60, // 1 year
    })

    return response
  } catch (error) {
    console.error("Error verifying purchase:", error)
    return NextResponse.json({ error: "Failed to verify purchase" }, { status: 500 })
  }
}
