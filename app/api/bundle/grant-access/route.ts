import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log(`🚀 [Grant Access] API called with auth`)

    // Get auth token
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { bundleId, creatorId } = await request.json()

    if (!bundleId) {
      return NextResponse.json({ error: "Missing bundleId" }, { status: 400 })
    }

    console.log(`⚡ [Grant Access] Processing with auth`)
    console.log(`📦 Bundle ID: ${bundleId}`)
    console.log(`👤 User ID: ${userId}`)

    // Try to find bundle in multiple collections
    let bundleDoc = null
    let bundleData = null
    let collectionUsed = ""

    // Check productBoxes first
    bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    if (bundleDoc.exists) {
      bundleData = bundleDoc.data()!
      collectionUsed = "productBoxes"
    } else {
      // Check bundles collection
      bundleDoc = await db.collection("bundles").doc(bundleId).get()
      if (bundleDoc.exists) {
        bundleData = bundleDoc.data()!
        collectionUsed = "bundles"
      }
    }

    if (!bundleData) {
      console.error(`❌ [Grant Access] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    console.log(`✅ [Grant Access] Bundle found in ${collectionUsed}: ${bundleData.title}`)

    // Get creator details
    let creatorData = null
    const targetCreatorId = creatorId || bundleData.creatorId || bundleData.userId
    if (targetCreatorId) {
      const creatorDoc = await db.collection("users").doc(targetCreatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Check existing purchase
    const existingPurchaseQuery = await db
      .collection("productBoxPurchases")
      .where("buyerUid", "==", userId)
      .where("productBoxId", "==", bundleId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    let alreadyPurchased = false
    if (!existingPurchaseQuery.empty) {
      alreadyPurchased = true
    } else {
      // Create purchase record
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
        verificationMethod: "auth_grant_success_page",
        metadata: {
          grantedVia: "auth_grant",
          autoGranted: true,
          timestamp: new Date().toISOString(),
          collectionUsed: collectionUsed,
        },
      }

      await db.collection("productBoxPurchases").add(purchaseData)

      // Create unified purchase
      const unifiedPurchaseId = `auth_${userId}_${bundleId}_${Date.now()}`
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
          verificationMethod: "auth_grant_success_page",
          purchaseDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          grantedAt: new Date(),
          autoGranted: true,
          collectionUsed: collectionUsed,
        })
    }

    return NextResponse.json({
      success: true,
      alreadyPurchased,
      bundle: {
        id: bundleId,
        title: bundleData.title || bundleData.name || "Untitled Bundle",
        description: bundleData.description || bundleData.summary || "",
        thumbnailUrl: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail || "",
        price: bundleData.price || 0,
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
