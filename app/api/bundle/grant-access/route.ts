import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log(`🚀 [Bundle Access] API called`)

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the ID token
    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { bundleId, creatorId } = await request.json()

    if (!bundleId) {
      return NextResponse.json({ error: "Missing bundleId" }, { status: 400 })
    }

    console.log(`⚡ [Bundle Access] Processing for user ${userId}`)
    console.log(`📦 Bundle ID: ${bundleId}`)
    console.log(`👤 User Email: ${decodedToken.email}`)

    // Get bundle details from productBoxes collection (bundles are stored as productBoxes)
    const bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.error(`❌ [Bundle Access] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ [Bundle Access] Bundle found: ${bundleData.title}`)

    // Get creator details
    let creatorData = null
    const targetCreatorId = creatorId || bundleData.creatorId
    if (targetCreatorId) {
      const creatorDoc = await db.collection("users").doc(targetCreatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
      console.log(`✅ [Bundle Access] Creator found: ${creatorData?.username || targetCreatorId}`)
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
      console.log(`ℹ️ [Bundle Access] User already has access to ${bundleId}`)
      alreadyPurchased = true
    } else {
      // Create purchase record - grant immediate access
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
        verificationMethod: "success_page_auto_grant",
        metadata: {
          grantedVia: "success_page",
          userEmail: decodedToken.email || "",
          autoGranted: true,
        },
      }

      await db.collection("productBoxPurchases").add(purchaseData)
      console.log(`✅ [Bundle Access] Created purchase record for ${bundleId}`)

      // Also create unified purchase record
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
          verificationMethod: "success_page_auto_grant",
          purchaseDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          grantedAt: new Date(),
          autoGranted: true,
        })
      console.log(`✅ [Bundle Access] Created unified purchase: ${unifiedPurchaseId}`)
    }

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
    console.error(`❌ [Bundle Access] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to grant bundle access",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
