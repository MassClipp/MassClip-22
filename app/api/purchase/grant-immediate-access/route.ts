import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { requireAuth } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await requireAuth(request)
    const { bundleId, creatorId, verificationMethod = "landing_page" } = await request.json()

    if (!bundleId) {
      return NextResponse.json({ error: "Missing bundleId" }, { status: 400 })
    }

    console.log(`🚀 [Grant Access] Processing immediate access for user ${decodedToken.uid}`)
    console.log(`📦 Bundle: ${bundleId}`)
    console.log(`🔍 Verification: ${verificationMethod}`)

    // Get bundle details
    const bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!

    // Get creator details if provided
    let creatorData = null
    if (creatorId) {
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
    }

    // Check if user already has access
    const existingPurchase = await db
      .collection("unifiedPurchases")
      .where("userId", "==", decodedToken.uid)
      .where("productBoxId", "==", bundleId)
      .limit(1)
      .get()

    if (!existingPurchase.empty) {
      console.log(`✅ [Grant Access] User already has access`)
      return NextResponse.json({
        success: true,
        alreadyPurchased: true,
        bundle: {
          id: bundleId,
          title: bundleData.title,
          description: bundleData.description,
          thumbnailUrl: bundleData.thumbnailUrl,
          price: bundleData.price,
          currency: "usd",
        },
        creator: creatorData
          ? {
              id: creatorId,
              name: creatorData.displayName || creatorData.name,
              username: creatorData.username,
            }
          : null,
      })
    }

    // Create unified purchase record
    const purchaseId = `${decodedToken.uid}_${bundleId}_${Date.now()}`
    const purchaseData = {
      id: purchaseId,
      userId: decodedToken.uid,
      productBoxId: bundleId,
      bundleId: bundleId,
      creatorId: creatorId || bundleData.creatorId || "",
      amount: bundleData.price || 0,
      currency: "usd",
      status: "completed",
      verificationMethod: verificationMethod,
      purchaseDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        grantedVia: "immediate_access",
        verificationMethod: verificationMethod,
        userAgent: request.headers.get("user-agent") || "",
      },
    }

    // Store in unified purchases collection
    await db.collection("unifiedPurchases").doc(purchaseId).set(purchaseData)

    // Also store in legacy purchases collection for backward compatibility
    const legacyPurchaseId = `legacy_${purchaseId}`
    await db
      .collection("purchases")
      .doc(legacyPurchaseId)
      .set({
        ...purchaseData,
        legacyId: legacyPurchaseId,
        migratedFrom: "immediate_access",
      })

    console.log(`✅ [Grant Access] Purchase records created successfully`)
    console.log(`📝 Unified Purchase: ${purchaseId}`)
    console.log(`📝 Legacy Purchase: ${legacyPurchaseId}`)

    return NextResponse.json({
      success: true,
      alreadyPurchased: false,
      purchaseId: purchaseId,
      bundle: {
        id: bundleId,
        title: bundleData.title,
        description: bundleData.description,
        thumbnailUrl: bundleData.thumbnailUrl,
        price: bundleData.price,
        currency: "usd",
      },
      creator: creatorData
        ? {
            id: creatorId,
            name: creatorData.displayName || creatorData.name,
            username: creatorData.username,
          }
        : null,
    })
  } catch (error: any) {
    console.error(`❌ [Grant Access] Error:`, error)
    return NextResponse.json(
      {
        error: error.message || "Failed to grant access",
        success: false,
      },
      { status: 500 },
    )
  }
}
