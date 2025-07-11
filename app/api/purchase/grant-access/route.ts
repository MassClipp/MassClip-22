import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log(`🚀 [Grant Access] API called`)

    const { productBoxId, bundleId, creatorId, sessionId, userId } = await request.json()
    const targetId = productBoxId || bundleId

    if (!targetId) {
      return NextResponse.json({ error: "Missing product box ID" }, { status: 400 })
    }

    let authenticatedUserId = userId

    // Try to get user from auth header if not provided
    if (!authenticatedUserId) {
      const authHeader = request.headers.get("authorization")
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const idToken = authHeader.split("Bearer ")[1]
          const decodedToken = await auth.verifyIdToken(idToken)
          authenticatedUserId = decodedToken.uid
        } catch (authError) {
          console.log("⚠️ [Grant Access] Auth token verification failed, continuing without auth")
        }
      }
    }

    console.log(`⚡ [Grant Access] Processing for user ${authenticatedUserId || "anonymous"}`)
    console.log(`📦 Product Box: ${targetId}`)

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(targetId).get()
    if (!productBoxDoc.exists) {
      console.error(`❌ [Grant Access] Product box not found: ${targetId}`)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log(`✅ [Grant Access] Product box found: ${productBoxData.title}`)

    // If we have a user ID, check for existing purchase and create if needed
    let alreadyPurchased = false
    if (authenticatedUserId) {
      const existingPurchaseQuery = await db
        .collection("productBoxPurchases")
        .where("buyerUid", "==", authenticatedUserId)
        .where("productBoxId", "==", targetId)
        .where("status", "==", "completed")
        .limit(1)
        .get()

      if (!existingPurchaseQuery.empty) {
        console.log(`ℹ️ [Grant Access] User already has access to ${targetId}`)
        alreadyPurchased = true
      } else {
        // Create purchase record for authenticated user
        const purchaseData = {
          buyerUid: authenticatedUserId,
          productBoxId: targetId,
          creatorId: productBoxData.creatorId,
          amount: productBoxData.price || 0,
          currency: productBoxData.currency || "usd",
          status: "completed",
          type: "product_box",
          createdAt: new Date(),
          completedAt: new Date(),
          verificationMethod: "auto_grant_access",
          sessionId: sessionId || null,
        }

        await db.collection("productBoxPurchases").add(purchaseData)

        // Also add to unified purchases
        await db
          .collection("users")
          .doc(authenticatedUserId)
          .collection("purchases")
          .add({
            ...purchaseData,
            itemId: targetId,
            itemTitle: productBoxData.title,
            itemDescription: productBoxData.description,
            thumbnailUrl: productBoxData.thumbnailUrl || productBoxData.customPreviewThumbnail,
            accessUrl: `/product-box/${targetId}/content`,
          })

        console.log(`✅ [Grant Access] Created purchase record for ${targetId}`)
      }
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
      hasAuth: !!authenticatedUserId,
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
