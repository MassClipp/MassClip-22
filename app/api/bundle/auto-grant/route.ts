import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log(`🚀 [Auto Grant] API called`)

    const { bundleId, userId, creatorId } = await request.json()

    if (!bundleId || !userId) {
      console.log(`❌ [Auto Grant] Missing required fields:`, { bundleId, userId })
      return NextResponse.json({ error: "Missing bundleId or userId" }, { status: 400 })
    }

    console.log(`⚡ [Auto Grant] Processing auto-grant`)
    console.log(`📦 Bundle ID: ${bundleId}`)
    console.log(`👤 User ID: ${userId}`)
    console.log(`🎨 Creator ID: ${creatorId}`)

    // Try multiple collection names to find the bundle
    let bundleDoc = null
    let bundleData = null
    let collectionUsed = ""

    // Check productBoxes collection first
    console.log(`🔍 [Auto Grant] Checking productBoxes collection...`)
    bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    if (bundleDoc.exists) {
      bundleData = bundleDoc.data()!
      collectionUsed = "productBoxes"
      console.log(`✅ [Auto Grant] Bundle found in productBoxes: ${bundleData.title}`)
    } else {
      // Check bundles collection as backup
      console.log(`🔍 [Auto Grant] Checking bundles collection...`)
      bundleDoc = await db.collection("bundles").doc(bundleId).get()
      if (bundleDoc.exists) {
        bundleData = bundleDoc.data()!
        collectionUsed = "bundles"
        console.log(`✅ [Auto Grant] Bundle found in bundles: ${bundleData.title}`)
      }
    }

    if (!bundleData) {
      console.error(`❌ [Auto Grant] Bundle not found in any collection: ${bundleId}`)

      // Let's also try to list some documents to debug
      try {
        const productBoxesSnapshot = await db.collection("productBoxes").limit(5).get()
        console.log(
          `🔍 [Debug] Sample productBoxes IDs:`,
          productBoxesSnapshot.docs.map((doc) => doc.id),
        )

        const bundlesSnapshot = await db.collection("bundles").limit(5).get()
        console.log(
          `🔍 [Debug] Sample bundles IDs:`,
          bundlesSnapshot.docs.map((doc) => doc.id),
        )
      } catch (debugError) {
        console.error(`❌ [Debug] Error listing collections:`, debugError)
      }

      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    // Get creator details
    let creatorData = null
    const targetCreatorId = creatorId || bundleData.creatorId || bundleData.userId
    if (targetCreatorId) {
      console.log(`🔍 [Auto Grant] Looking up creator: ${targetCreatorId}`)
      const creatorDoc = await db.collection("users").doc(targetCreatorId).get()
      if (creatorDoc.exists) {
        creatorData = creatorDoc.data()
        console.log(
          `✅ [Auto Grant] Creator found: ${creatorData?.username || creatorData?.displayName || targetCreatorId}`,
        )
      } else {
        console.log(`⚠️ [Auto Grant] Creator not found: ${targetCreatorId}`)
      }
    }

    // Check if user already has access
    console.log(`🔍 [Auto Grant] Checking existing purchases...`)
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
      console.log(`🆕 [Auto Grant] Creating new purchase record...`)

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
          collectionUsed: collectionUsed,
        },
      }

      const purchaseRef = await db.collection("productBoxPurchases").add(purchaseData)
      console.log(`✅ [Auto Grant] Created purchase record: ${purchaseRef.id}`)

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
          currency: bundleData.currency || "usd",
          status: "completed",
          verificationMethod: "auto_grant_success_page",
          purchaseDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          grantedAt: new Date(),
          autoGranted: true,
          collectionUsed: collectionUsed,
        })
      console.log(`✅ [Auto Grant] Created unified purchase: ${unifiedPurchaseId}`)

      // Update bundle stats if possible
      try {
        await db
          .collection(collectionUsed)
          .doc(bundleId)
          .update({
            totalSales: db.FieldValue.increment(1),
            totalRevenue: db.FieldValue.increment(bundleData.price || 0),
            lastPurchaseAt: new Date(),
          })
        console.log(`✅ [Auto Grant] Bundle stats updated in ${collectionUsed}`)
      } catch (error) {
        console.warn(`⚠️ [Auto Grant] Could not update bundle stats:`, error)
      }
    }

    console.log(`🎉 [Auto Grant] ACCESS GRANTED SUCCESSFULLY!`)

    // Return bundle information
    const responseBundle = {
      id: bundleId,
      title: bundleData.title || bundleData.name || "Untitled Bundle",
      description: bundleData.description || bundleData.summary || "",
      thumbnailUrl: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail || bundleData.previewImage || "",
      price: bundleData.price || 0,
      currency: bundleData.currency || "usd",
    }

    const responseCreator = creatorData
      ? {
          id: targetCreatorId,
          name: creatorData.displayName || creatorData.name || creatorData.username || "Unknown Creator",
          username: creatorData.username || "",
        }
      : null

    return NextResponse.json({
      success: true,
      alreadyPurchased,
      bundle: responseBundle,
      creator: responseCreator,
      debug: {
        collectionUsed,
        bundleFound: true,
        creatorFound: !!creatorData,
      },
    })
  } catch (error: any) {
    console.error(`❌ [Auto Grant] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to auto-grant access",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
