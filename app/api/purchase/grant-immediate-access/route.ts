import { type NextRequest, NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the ID token
    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { bundleId, creatorId, verificationMethod = "landing_page_immediate" } = await request.json()

    if (!bundleId) {
      return NextResponse.json({ error: "Missing bundleId" }, { status: 400 })
    }

    console.log(`⚡ [Grant Access] INSTANT ACCESS - Processing for user ${userId}`)
    console.log(`📦 Bundle: ${bundleId}`)
    console.log(`🔍 Verification: ${verificationMethod}`)
    console.log(`👤 User Email: ${decodedToken.email}`)

    // Get bundle details from productBoxes collection
    const bundleDoc = await db.collection("productBoxes").doc(bundleId).get()
    if (!bundleDoc.exists) {
      console.error(`❌ [Grant Access] Bundle not found: ${bundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ [Grant Access] Bundle found: ${bundleData.title}`)

    // Get creator details if provided
    let creatorData = null
    if (creatorId) {
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
      console.log(`✅ [Grant Access] Creator found: ${creatorData?.username || creatorId}`)
    }

    // Check if user already has access
    const existingPurchase = await db
      .collection("unifiedPurchases")
      .where("userId", "==", userId)
      .where("productBoxId", "==", bundleId)
      .limit(1)
      .get()

    if (!existingPurchase.empty) {
      console.log(`✅ [Grant Access] User already has access - returning existing purchase`)
      const existingData = existingPurchase.docs[0].data()
      return NextResponse.json({
        success: true,
        alreadyPurchased: true,
        purchaseId: existingData.id,
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

    // Create unified purchase record with instant access
    const purchaseId = `instant_${userId}_${bundleId}_${Date.now()}`
    const purchaseData = {
      id: purchaseId,
      userId: userId,
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
      grantedAt: new Date(),
      instantAccess: true,
      metadata: {
        grantedVia: "instant_access",
        verificationMethod: verificationMethod,
        userAgent: request.headers.get("user-agent") || "",
        userEmail: decodedToken.email || "",
        instantGrant: true,
      },
    }

    // Store in unified purchases collection
    await db.collection("unifiedPurchases").doc(purchaseId).set(purchaseData)
    console.log(`✅ [Grant Access] Unified purchase created: ${purchaseId}`)

    // Also store in legacy purchases collection for backward compatibility
    const legacyPurchaseId = `legacy_${purchaseId}`
    await db
      .collection("purchases")
      .doc(legacyPurchaseId)
      .set({
        ...purchaseData,
        legacyId: legacyPurchaseId,
        migratedFrom: "instant_access",
        itemId: bundleId,
        itemTitle: bundleData.title || "Untitled Product Box",
        itemDescription: bundleData.description || "",
        thumbnailUrl: bundleData.thumbnailUrl || "",
        accessUrl: `/product-box/${bundleId}/content`,
        type: "product_box",
        timestamp: new Date(),
        purchasedAt: new Date(),
      })
    console.log(`✅ [Grant Access] Legacy purchase created: ${legacyPurchaseId}`)

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
      console.log(`✅ [Grant Access] Bundle stats updated`)
    } catch (error) {
      console.warn(`⚠️ [Grant Access] Could not update bundle stats:`, error)
    }

    console.log(`🎉 [Grant Access] INSTANT ACCESS GRANTED SUCCESSFULLY!`)
    console.log(`📝 Purchase ID: ${purchaseId}`)

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
      verificationDetails: {
        method: verificationMethod,
        verifiedAt: new Date().toISOString(),
        instantAccess: true,
        purchaseId: purchaseId,
      },
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
