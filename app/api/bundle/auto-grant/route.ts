import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log(`🚀 [Auto Grant] API called`)

    const { bundleId, userId, creatorId } = await request.json()

    if (!bundleId || !userId) {
      return NextResponse.json({ error: "Missing bundleId or userId" }, { status: 400 })
    }

    console.log(`⚡ [Auto Grant] Processing auto-grant`)
    console.log(`📦 Bundle ID: ${bundleId}`)
    console.log(`👤 User ID: ${userId}`)

    // Get bundle details from productBoxes collection
    const bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.error(`❌ [Auto Grant] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ [Auto Grant] Bundle found: ${bundleData.title}`)

    // Get creator details
    let creatorData = null
    const targetCreatorId = creatorId || bundleData.creatorId
    if (targetCreatorId) {
      const creatorDoc = await db.collection("users").doc(targetCreatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
      console.log(`✅ [Auto Grant] Creator found: ${creatorData?.username || targetCreatorId}`)
    }

    // Check if user already has access
    const existingPurchaseQuery = await db
      .collection("productBoxPurchases")
      .where("buyerUid", "==", userId)
      .where("productBoxId", "==", bundleId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    let alreadyPurchased = false
    if (!existingPurchaseQuery.empty) {
      console.log(`ℹ️ [Auto Grant] User already has access to ${bundleId}`)
      alreadyPurchased = true
    } else {
      // Create purchase record - auto grant access
      const purchaseData = {
        buyerUid: userId,
        productBoxId: bundleId,
        creatorId: targetCreatorId || "",
        amount: bundleData.price || 0,
        currency: bundleData.currency || "usd",
        status: "completed",
        type: "product_box",
        createdAt: new Date(),
        completedAt: new Date(),
        verificationMethod: "auto_grant_success_page",
        metadata: {
          grantedVia: "auto_grant",
          autoGranted: true,
          timestamp: new Date().toISOString(),
        },
      }

      await db.collection("productBoxPurchases").add(purchaseData)
      console.log(`✅ [Auto Grant] Created purchase record for ${bundleId}`)

      // Create unified purchase record
      const unifiedPurchaseId = `auto_${userId}_${bundleId}_${Date.now()}`
      await db
        .collection("unifiedPurchases")
        .doc(unifiedPurchaseId)
        .set({
          id: unifiedPurchaseId,
          userId: userId,
          productBoxId: bundleId,
          bundleId: bundleId,
          creatorId: targetCreatorId || "",
          amount: bundleData.price || 0,
          currency: "usd",
          status: "completed",
          verificationMethod: "auto_grant_success_page",
          purchaseDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          grantedAt: new Date(),
          autoGranted: true,
        })
      console.log(`✅ [Auto Grant] Created unified purchase: ${unifiedPurchaseId}`)

      // Update bundle stats
      try {
        await db
          .collection("productBoxes")
          .doc(bundleId)
          .update({
            totalSales: db.FieldValue.increment(1),
            totalRevenue: db.FieldValue.increment(bundleData.price || 0),
            lastPurchaseAt: new Date(),
          })
        console.log(`✅ [Auto Grant] Bundle stats updated`)
      } catch (error) {
        console.warn(`⚠️ [Auto Grant] Could not update bundle stats:`, error)
      }
    }

    console.log(`🎉 [Auto Grant] ACCESS GRANTED SUCCESSFULLY!`)

    return NextResponse.json({
      success: true,
      alreadyPurchased,
      bundle: {
        id: bundleId,
        title: bundleData.title,
        description: bundleData.description,
        thumbnailUrl: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail,
        price: bundleData.price,
        currency: bundleData.currency || "usd",
      },
      creator: creatorData
        ? {
            id: targetCreatorId,
            name: creatorData.displayName || creatorData.name || "Unknown Creator",
            username: creatorData.username || "",
          }
        : null,
    })
  } catch (error: any) {
    console.error(`❌ [Auto Grant] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to auto-grant access",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
