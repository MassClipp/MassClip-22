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

    const { bundleId, creatorId, verificationMethod = "landing_page" } = await request.json()

    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID required" }, { status: 400 })
    }

    console.log(`🎉 [Grant Access] CLIENT-SIDE TEST MODE - Granting immediate access`)
    console.log(`📦 Bundle: ${bundleId}`)
    console.log(`👤 User: ${userId}`)
    console.log(`🧪 Verification: ${verificationMethod}`)

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(bundleId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!

    // Get creator details
    let creatorData = null
    const finalCreatorId = creatorId || productBoxData.creatorId
    if (finalCreatorId) {
      const creatorDoc = await db.collection("users").doc(finalCreatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Check if user already has access
    const existingPurchaseQuery = await db
      .collection("purchases")
      .where("userId", "==", userId)
      .where("productBoxId", "==", bundleId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    let alreadyPurchased = false
    if (!existingPurchaseQuery.empty) {
      console.log(`ℹ️ [Grant Access] User already has access to ${bundleId}`)
      alreadyPurchased = true
    } else {
      // Create purchase record - CLIENT-SIDE TEST MODE
      const purchaseData = {
        userId: userId,
        buyerUid: userId,
        productBoxId: bundleId,
        itemId: bundleId,
        amount: productBoxData.price || 0,
        currency: productBoxData.currency || "usd",
        status: "completed",
        type: "product_box",
        itemTitle: productBoxData.title || "Untitled Product Box",
        itemDescription: productBoxData.description || "",
        thumbnailUrl: productBoxData.thumbnailUrl || "",
        customPreviewThumbnail: productBoxData.customPreviewThumbnail || "",
        creatorId: finalCreatorId || "",
        creatorName: creatorData?.displayName || creatorData?.name || "",
        creatorUsername: creatorData?.username || "",
        accessUrl: `/product-box/${bundleId}/content`,
        verificationMethod: verificationMethod,
        verifiedAt: new Date(),
        createdAt: new Date(),
        purchasedAt: new Date(),
        timestamp: new Date(),
        // CLIENT-SIDE TEST MODE - no Stripe session
        sessionId: `test_${Date.now()}_${userId.substring(0, 8)}`,
        paymentIntentId: `pi_test_${Date.now()}_${userId.substring(0, 8)}`,
      }

      // Write to main purchases collection
      await db.collection("purchases").add(purchaseData)

      // Also write to user's purchases subcollection for backward compatibility
      await db.collection("users").doc(userId).collection("purchases").add(purchaseData)

      // Create unified purchase record
      await db.collection("unifiedPurchases").add({
        userId: userId,
        productBoxId: bundleId,
        amount: productBoxData.price || 0,
        currency: productBoxData.currency || "usd",
        creatorId: finalCreatorId || "",
        status: "completed",
        verificationMethod: verificationMethod,
        createdAt: new Date(),
        purchasedAt: new Date(),
        sessionId: purchaseData.sessionId,
        paymentIntentId: purchaseData.paymentIntentId,
      })

      console.log(`✅ [Grant Access] Created purchase records for ${bundleId}`)

      // Update product box sales counter
      await db
        .collection("productBoxes")
        .doc(bundleId)
        .update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(productBoxData.price || 0),
          lastPurchaseAt: new Date(),
        })

      // Record the sale for the creator
      if (finalCreatorId) {
        const platformFee = (productBoxData.price || 0) * 0.05 // 5% platform fee
        const netAmount = (productBoxData.price || 0) - platformFee

        await db
          .collection("users")
          .doc(finalCreatorId)
          .collection("sales")
          .add({
            productBoxId: bundleId,
            buyerUid: userId,
            sessionId: purchaseData.sessionId,
            amount: productBoxData.price || 0,
            platformFee,
            netAmount,
            purchasedAt: new Date(),
            status: "completed",
            productTitle: productBoxData.title || "Untitled Product Box",
            buyerEmail: decodedToken.email || "",
            verificationMethod: verificationMethod,
          })

        // Increment the creator's total sales
        await db
          .collection("users")
          .doc(finalCreatorId)
          .update({
            totalSales: db.FieldValue.increment(1),
            totalRevenue: db.FieldValue.increment(productBoxData.price || 0),
            lastSaleAt: new Date(),
          })
      }
    }

    // Return success with product details
    return NextResponse.json({
      success: true,
      alreadyPurchased,
      bundle: {
        id: bundleId,
        title: productBoxData.title,
        description: productBoxData.description,
        thumbnailUrl: productBoxData.thumbnailUrl || productBoxData.customPreviewThumbnail,
        price: productBoxData.price,
        currency: productBoxData.currency,
      },
      creator: creatorData
        ? {
            id: finalCreatorId,
            name: creatorData.displayName || creatorData.name || "Unknown Creator",
            username: creatorData.username || "",
          }
        : null,
      verificationDetails: {
        method: verificationMethod,
        verifiedAt: new Date().toISOString(),
        mode: "client_side_test",
      },
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
