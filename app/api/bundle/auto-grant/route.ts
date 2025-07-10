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
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    // Get bundle contents
    console.log(`🔍 [Auto Grant] Fetching bundle contents...`)
    let bundleContents: any[] = []

    try {
      // Check productBoxContent collection
      const contentQuery = await db.collection("productBoxContent").where("productBoxId", "==", bundleId).get()

      bundleContents = contentQuery.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        contentId: doc.id,
      }))

      console.log(`✅ [Auto Grant] Found ${bundleContents.length} content items`)
    } catch (contentError) {
      console.warn(`⚠️ [Auto Grant] Could not fetch bundle contents:`, contentError)
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
      .collection("bundlePurchases")
      .where("buyerUid", "==", userId)
      .where("bundleId", "==", bundleId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    let alreadyPurchased = false
    if (!existingPurchaseQuery.empty) {
      console.log(`ℹ️ [Auto Grant] User already has access to ${bundleId}`)
      alreadyPurchased = true
    } else {
      console.log(`🆕 [Auto Grant] Creating new purchase record in bundlePurchases...`)

      // Create purchase record in bundlePurchases collection with contents
      const purchaseData = {
        buyerUid: userId,
        bundleId: bundleId,
        productBoxId: bundleId, // For compatibility
        creatorId: targetCreatorId || "",
        amount: bundleData.price || 0,
        currency: bundleData.currency || "usd",
        status: "completed",
        type: "bundle",
        createdAt: new Date(),
        completedAt: new Date(),
        verificationMethod: "auto_grant_success_page",

        // Bundle details
        bundleTitle: bundleData.title || bundleData.name || "Untitled Bundle",
        bundleDescription: bundleData.description || bundleData.summary || "",
        bundleThumbnail: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail || bundleData.previewImage || "",

        // Creator details
        creatorUsername: creatorData?.username || "",
        creatorName: creatorData?.displayName || creatorData?.name || "",

        // Bundle contents
        contents: bundleContents,
        contentCount: bundleContents.length,
        totalSize: bundleContents.reduce((sum, item) => sum + (item.fileSize || 0), 0),

        metadata: {
          grantedVia: "auto_grant",
          autoGranted: true,
          timestamp: new Date().toISOString(),
          collectionUsed: collectionUsed,
          contentsIncluded: bundleContents.length > 0,
        },
      }

      const purchaseRef = await db.collection("bundlePurchases").add(purchaseData)
      console.log(`✅ [Auto Grant] Created bundlePurchases record: ${purchaseRef.id}`)

      // Also create in productBoxPurchases for compatibility
      const productBoxPurchaseData = {
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
          bundlePurchaseId: purchaseRef.id,
        },
      }

      await db.collection("productBoxPurchases").add(productBoxPurchaseData)
      console.log(`✅ [Auto Grant] Created productBoxPurchases record for compatibility`)

      // Create unified purchase record with full details
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

          // Bundle details for display
          bundleTitle: bundleData.title || bundleData.name || "Untitled Bundle",
          productBoxTitle: bundleData.title || bundleData.name || "Untitled Bundle",
          bundleDescription: bundleData.description || bundleData.summary || "",
          thumbnailUrl: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail || bundleData.previewImage || "",
          productBoxThumbnail:
            bundleData.thumbnailUrl || bundleData.customPreviewThumbnail || bundleData.previewImage || "",

          // Creator details
          creatorUsername: creatorData?.username || "",
          creatorName: creatorData?.displayName || creatorData?.name || "",

          // Contents
          items: bundleContents,
          totalItems: bundleContents.length,
          totalSize: bundleContents.reduce((sum, item) => sum + (item.fileSize || 0), 0),
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
      contentCount: bundleContents.length,
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
      contents: bundleContents,
      debug: {
        collectionUsed,
        bundleFound: true,
        creatorFound: !!creatorData,
        contentsFound: bundleContents.length,
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
