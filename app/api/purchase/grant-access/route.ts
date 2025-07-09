import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { productBoxId } = await request.json()

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID required" }, { status: 400 })
    }

    console.log(`🎉 [Grant Access] Granting access to ${productBoxId} for user ${userId}`)

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!

    // Get creator details
    const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
    const creatorData = creatorDoc.exists ? creatorDoc.data() : null

    // Check if user already has access
    const existingPurchaseQuery = await db
      .collection("productBoxPurchases")
      .where("buyerUid", "==", userId)
      .where("productBoxId", "==", productBoxId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    let alreadyPurchased = false
    if (!existingPurchaseQuery.empty) {
      console.log(`ℹ️ [Grant Access] User already has access to ${productBoxId}`)
      alreadyPurchased = true
    } else {
      // Create purchase record - simple and immediate
      const purchaseData = {
        buyerUid: userId,
        productBoxId: productBoxId,
        creatorId: productBoxData.creatorId,
        amount: productBoxData.price || 0,
        currency: productBoxData.currency || "usd",
        status: "completed",
        type: "product_box",
        createdAt: new Date(),
        completedAt: new Date(),
        // No Stripe session ID or payment intent - we don't need it!
        verificationMethod: "landing_page", // Simple verification method
      }

      await db.collection("productBoxPurchases").add(purchaseData)
      console.log(`✅ [Grant Access] Created purchase record for ${productBoxId}`)
    }

    // Return success with product details
    return NextResponse.json({
      success: true,
      alreadyPurchased,
      productBox: {
        id: productBoxId,
        title: productBoxData.title,
        description: productBoxData.description,
        thumbnailUrl: productBoxData.thumbnailUrl || productBoxData.customPreviewThumbnail,
        price: productBoxData.price,
        currency: productBoxData.currency,
      },
      creator: creatorData
        ? {
            id: productBoxData.creatorId,
            name: creatorData.displayName || creatorData.name || "Unknown Creator",
            username: creatorData.username || "",
          }
        : null,
    })
  } catch (error: any) {
    console.error(`❌ [Grant Access] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to grant access",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
