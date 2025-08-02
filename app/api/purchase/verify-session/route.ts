import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb } from "@/lib/firebase-server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

interface PurchaseData {
  sessionId: string
  customerId?: string
  customerEmail?: string
  amountTotal: number
  currency: string
  paymentStatus: string
  createdAt: string
  itemType: "bundle" | "product_box" | "subscription"
  itemId: string
  itemTitle?: string
  itemDescription?: string
  itemThumbnail?: string
  creatorId?: string
  creatorName?: string
  creatorUsername?: string
  transactionId?: string
  accessStatus: "active" | "pending" | "expired"
}

async function getEnhancedPurchaseData(
  session: Stripe.Checkout.Session,
  itemType: string,
  itemId: string,
): Promise<Partial<PurchaseData>> {
  const db = getAdminDb()
  const enhancedData: Partial<PurchaseData> = {}

  try {
    // Get item details based on type
    if (itemType === "bundle") {
      const bundleDoc = await db.collection("bundles").doc(itemId).get()
      if (bundleDoc.exists) {
        const bundleData = bundleDoc.data()
        enhancedData.itemTitle = bundleData?.title || "Bundle"
        enhancedData.itemDescription = bundleData?.description
        enhancedData.itemThumbnail = bundleData?.thumbnail
        enhancedData.creatorId = bundleData?.creatorId
      }
    } else if (itemType === "product_box") {
      const productBoxDoc = await db.collection("product_boxes").doc(itemId).get()
      if (productBoxDoc.exists) {
        const productBoxData = productBoxDoc.data()
        enhancedData.itemTitle = productBoxData?.title || "Product Box"
        enhancedData.itemDescription = productBoxData?.description
        enhancedData.itemThumbnail = productBoxData?.thumbnail
        enhancedData.creatorId = productBoxData?.creatorId
      }
    }

    // Get creator details if we have a creatorId
    if (enhancedData.creatorId) {
      const creatorDoc = await db.collection("users").doc(enhancedData.creatorId).get()
      if (creatorDoc.exists) {
        const creatorData = creatorDoc.data()
        enhancedData.creatorName = creatorData?.displayName || creatorData?.name
        enhancedData.creatorUsername = creatorData?.username
      }
    }

    // Extract additional data from session metadata
    const metadata = session.metadata || {}
    if (metadata.creatorName) enhancedData.creatorName = metadata.creatorName
    if (metadata.creatorUsername) enhancedData.creatorUsername = metadata.creatorUsername
    if (metadata.itemTitle) enhancedData.itemTitle = metadata.itemTitle
  } catch (error) {
    console.error("Error fetching enhanced purchase data:", error)
  }

  return enhancedData
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log(`[Purchase Success] Starting verification for session: ${sessionId}`)

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "customer"],
    })

    console.log(`[Purchase Success] Verification response status: ${session.payment_status}`)

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        {
          error: "Payment not completed",
          success: false,
          alreadyProcessed: false,
          purchase: null,
        },
        { status: 400 },
      )
    }

    // Extract purchase information from session
    const metadata = session.metadata || {}
    const itemType = metadata.type || "bundle"
    const itemId = metadata.itemId || metadata.bundleId || metadata.productBoxId
    const buyerId = metadata.buyerId
    const creatorId = metadata.creatorId

    if (!itemId) {
      console.error("[Purchase Success] No item ID found in session metadata")
      return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 })
    }

    const db = getAdminDb()

    // Check if purchase already exists
    const existingPurchaseQuery = await db.collection("purchases").where("sessionId", "==", sessionId).limit(1).get()

    let purchaseData: PurchaseData

    if (!existingPurchaseQuery.empty) {
      // Purchase already exists, get enhanced data
      const existingPurchase = existingPurchaseQuery.docs[0].data()
      const enhancedData = await getEnhancedPurchaseData(session, itemType, itemId)

      purchaseData = {
        sessionId,
        customerId: session.customer as string,
        customerEmail: session.customer_details?.email || undefined,
        amountTotal: session.amount_total || 0,
        currency: session.currency || "usd",
        paymentStatus: session.payment_status,
        createdAt: new Date(session.created * 1000).toISOString(),
        itemType: itemType as "bundle" | "product_box" | "subscription",
        itemId,
        transactionId: session.payment_intent as string,
        accessStatus: "active",
        ...enhancedData,
        ...existingPurchase,
      }

      console.log(`[Purchase Success] Purchase already verified and processed`)
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        purchase: purchaseData,
        message: "Purchase already verified and processed",
      })
    }

    // Get enhanced purchase data
    const enhancedData = await getEnhancedPurchaseData(session, itemType, itemId)

    // Create new purchase record
    purchaseData = {
      sessionId,
      customerId: session.customer as string,
      customerEmail: session.customer_details?.email || undefined,
      amountTotal: session.amount_total || 0,
      currency: session.currency || "usd",
      paymentStatus: session.payment_status,
      createdAt: new Date(session.created * 1000).toISOString(),
      itemType: itemType as "bundle" | "product_box" | "subscription",
      itemId,
      transactionId: session.payment_intent as string,
      accessStatus: "active",
      ...enhancedData,
    }

    // Save purchase to database
    const purchaseDoc = {
      ...purchaseData,
      buyerId: buyerId || null,
      creatorId: creatorId || enhancedData.creatorId || null,
      purchaseDate: new Date(),
      status: "completed",
      verified: true,
    }

    await db.collection("purchases").add(purchaseDoc)

    // Grant access based on item type
    if (buyerId) {
      if (itemType === "bundle") {
        await db.collection("user_bundle_access").add({
          userId: buyerId,
          bundleId: itemId,
          grantedAt: new Date(),
          sessionId,
          status: "active",
        })
      } else if (itemType === "product_box") {
        await db.collection("user_product_box_access").add({
          userId: buyerId,
          productBoxId: itemId,
          grantedAt: new Date(),
          sessionId,
          status: "active",
        })
      }
    }

    console.log(`[Purchase Success] Verification successful`)

    return NextResponse.json({
      success: true,
      alreadyProcessed: false,
      purchase: purchaseData,
      message: "Purchase verified and processed",
    })
  } catch (error) {
    console.error("[Purchase Success] Verification failed:", error)
    return NextResponse.json(
      {
        error: "Verification failed",
        success: false,
        alreadyProcessed: false,
        purchase: null,
      },
      { status: 500 },
    )
  }
}
