import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import { UnifiedPurchaseService } from "@/lib/unified-purchase-service"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { bundleId, productBoxId, creatorId, verificationMethod = "landing_page" } = await request.json()

    // Use bundleId if provided, otherwise use productBoxId
    const actualProductBoxId = bundleId || productBoxId

    if (!actualProductBoxId) {
      return NextResponse.json({ error: "Product box ID required" }, { status: 400 })
    }

    console.log(`🎉 [Grant Immediate Access] Processing for user ${userId}, product box ${actualProductBoxId}`)

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(actualProductBoxId).get()
    if (!productBoxDoc.exists) {
      console.error(`❌ [Grant Access] Product box not found: ${actualProductBoxId}`)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    const actualCreatorId = creatorId || productBoxData.creatorId

    // Get creator details
    let creatorData = null
    if (actualCreatorId) {
      const creatorDoc = await db.collection("users").doc(actualCreatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Check if user already has access via unified purchases
    const existingUnifiedPurchase = await UnifiedPurchaseService.hasUserPurchased(userId, actualProductBoxId)

    if (existingUnifiedPurchase) {
      console.log(`ℹ️ [Grant Access] User already has unified purchase for ${actualProductBoxId}`)
      return NextResponse.json({
        success: true,
        alreadyPurchased: true,
        bundle: {
          id: actualProductBoxId,
          title: productBoxData.title || "Untitled Bundle",
          description: productBoxData.description || "",
          thumbnailUrl: productBoxData.thumbnailUrl || productBoxData.customPreviewThumbnail || "",
          price: productBoxData.price || 0,
          currency: productBoxData.currency || "usd",
        },
        creator: creatorData
          ? {
              id: actualCreatorId,
              name: creatorData.displayName || creatorData.name || "Unknown Creator",
              username: creatorData.username || "",
            }
          : null,
      })
    }

    // Check legacy purchases
    const legacyPurchasesQuery = await db
      .collection("purchases")
      .where("buyerUid", "==", userId)
      .where("productBoxId", "==", actualProductBoxId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    let alreadyPurchased = false
    if (!legacyPurchasesQuery.empty) {
      console.log(`ℹ️ [Grant Access] Found legacy purchase, migrating to unified format`)

      // Migrate legacy purchase to unified format
      const legacyPurchase = legacyPurchasesQuery.docs[0].data()
      const sessionId = legacyPurchase.sessionId || `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await UnifiedPurchaseService.createUnifiedPurchase(userId, {
        productBoxId: actualProductBoxId,
        sessionId: sessionId,
        amount: legacyPurchase.amount || productBoxData.price || 0,
        currency: legacyPurchase.currency || productBoxData.currency || "usd",
        creatorId: actualCreatorId || "",
      })

      alreadyPurchased = true
    } else {
      // Create new purchase record - IMMEDIATE ACCESS!
      console.log(`🚀 [Grant Access] Creating new purchase record with immediate access`)

      const sessionId = `immediate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Create unified purchase
      await UnifiedPurchaseService.createUnifiedPurchase(userId, {
        productBoxId: actualProductBoxId,
        sessionId: sessionId,
        amount: productBoxData.price || 0,
        currency: productBoxData.currency || "usd",
        creatorId: actualCreatorId || "",
      })

      // Also create legacy purchase for backward compatibility
      const purchaseData = {
        buyerUid: userId,
        userId: userId,
        productBoxId: actualProductBoxId,
        itemId: actualProductBoxId,
        creatorId: actualCreatorId,
        amount: productBoxData.price || 0,
        currency: productBoxData.currency || "usd",
        status: "completed",
        type: "product_box",
        createdAt: new Date(),
        completedAt: new Date(),
        purchasedAt: new Date(),
        sessionId: sessionId,
        verificationMethod: verificationMethod,
        itemTitle: productBoxData.title || "Untitled Bundle",
        itemDescription: productBoxData.description || "",
        thumbnailUrl: productBoxData.thumbnailUrl || productBoxData.customPreviewThumbnail || "",
        accessUrl: `/product-box/${actualProductBoxId}/content`,
      }

      // Write to multiple collections for compatibility
      await db.collection("purchases").doc(sessionId).set(purchaseData)
      await db.collection("users").doc(userId).collection("purchases").doc(sessionId).set(purchaseData)

      console.log(`✅ [Grant Access] Created purchase records for ${actualProductBoxId}`)
    }

    // Return success with product details
    return NextResponse.json({
      success: true,
      alreadyPurchased,
      bundle: {
        id: actualProductBoxId,
        title: productBoxData.title || "Untitled Bundle",
        description: productBoxData.description || "",
        thumbnailUrl: productBoxData.thumbnailUrl || productBoxData.customPreviewThumbnail || "",
        price: productBoxData.price || 0,
        currency: productBoxData.currency || "usd",
      },
      creator: creatorData
        ? {
            id: actualCreatorId,
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
