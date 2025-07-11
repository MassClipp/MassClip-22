import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log(`🚀 [Grant Access Backup] API called`)

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the ID token
    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { productBoxId, bundleId, creatorId } = await request.json()
    const targetId = productBoxId || bundleId

    if (!targetId) {
      return NextResponse.json({ error: "Missing product box ID" }, { status: 400 })
    }

    console.log(`⚡ [Grant Access Backup] Processing for user ${userId}`)
    console.log(`📦 Product Box: ${targetId}`)

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(targetId).get()
    if (!productBoxDoc.exists) {
      console.error(`❌ [Grant Access Backup] Product box not found: ${targetId}`)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log(`✅ [Grant Access Backup] Product box found: ${productBoxData.title}`)

    // Check if user already has access
    const existingPurchaseQuery = await db
      .collection("productBoxPurchases")
      .where("buyerUid", "==", userId)
      .where("productBoxId", "==", targetId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    let alreadyPurchased = false
    if (!existingPurchaseQuery.empty) {
      console.log(`ℹ️ [Grant Access Backup] User already has access to ${targetId}`)
      alreadyPurchased = true
    } else {
      // Create purchase record
      const purchaseData = {
        buyerUid: userId,
        productBoxId: targetId,
        creatorId: productBoxData.creatorId,
        amount: productBoxData.price || 0,
        currency: productBoxData.currency || "usd",
        status: "completed",
        type: "product_box",
        createdAt: new Date(),
        completedAt: new Date(),
        verificationMethod: "backup_landing_page",
      }

      await db.collection("productBoxPurchases").add(purchaseData)
      console.log(`✅ [Grant Access Backup] Created purchase record for ${targetId}`)
    }

    // Get creator details
    const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
    const creatorData = creatorDoc.exists ? creatorDoc.data() : null

    return NextResponse.json({
      success: true,
      alreadyPurchased,
      productBox: {
        id: targetId,
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
    console.error(`❌ [Grant Access Backup] Error:`, error)
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
