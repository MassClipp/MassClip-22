import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { requireAuth } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [Grant Access] API route called")

    const decodedToken = await requireAuth(request)
    const body = await request.json()
    const { bundleId, creatorId, verificationMethod = "landing_page_immediate" } = body

    console.log("📝 [Grant Access] Request data:", {
      bundleId,
      creatorId,
      verificationMethod,
      userId: decodedToken.uid,
    })

    if (!bundleId) {
      console.error("❌ [Grant Access] Missing bundleId")
      return NextResponse.json({ error: "Missing bundleId" }, { status: 400 })
    }

    console.log(`⚡ [Grant Access] INSTANT ACCESS - Processing for user ${decodedToken.uid}`)
    console.log(`📦 Bundle: ${bundleId}`)
    console.log(`🔍 Verification: ${verificationMethod}`)
    console.log(`👤 User Email: ${decodedToken.email}`)

    // Get bundle details
    console.log(`🔍 [Grant Access] Looking up bundle: ${bundleId}`)
    const bundleDoc = await db.collection("productBoxes").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.error(`❌ [Grant Access] Bundle not found: ${bundleId}`)

      // Let's also check if it exists in other collections
      const uploadsDoc = await db.collection("uploads").doc(bundleId).get()
      if (uploadsDoc.exists) {
        console.log(`🔍 [Grant Access] Found in uploads collection instead`)
        const uploadData = uploadsDoc.data()!

        // Create a purchase record for upload
        const purchaseId = `instant_upload_${decodedToken.uid}_${bundleId}_${Date.now()}`
        const purchaseData = {
          id: purchaseId,
          userId: decodedToken.uid,
          uploadId: bundleId,
          productBoxId: bundleId,
          bundleId: bundleId,
          creatorId: creatorId || uploadData.creatorId || uploadData.userId || "",
          amount: 0, // Free content
          currency: "usd",
          status: "completed",
          verificationMethod: verificationMethod,
          purchaseDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          grantedAt: new Date(),
          instantAccess: true,
          type: "upload",
          metadata: {
            grantedVia: "instant_access_upload",
            verificationMethod: verificationMethod,
            userAgent: request.headers.get("user-agent") || "",
            userEmail: decodedToken.email || "",
            instantGrant: true,
          },
        }

        await db.collection("unifiedPurchases").doc(purchaseId).set(purchaseData)

        return NextResponse.json({
          success: true,
          alreadyPurchased: false,
          purchaseId: purchaseId,
          bundle: {
            id: bundleId,
            title: uploadData.title || "Video Content",
            description: uploadData.description || "Premium video content",
            thumbnailUrl: uploadData.thumbnailUrl || "",
            price: 0,
            currency: "usd",
          },
          creator: null,
          verificationDetails: {
            method: verificationMethod,
            verifiedAt: new Date().toISOString(),
            instantAccess: true,
            purchaseId: purchaseId,
            type: "upload",
          },
        })
      }

      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ [Grant Access] Bundle found: ${bundleData.title}`)

    // Get creator details if provided
    let creatorData = null
    if (creatorId) {
      console.log(`🔍 [Grant Access] Looking up creator: ${creatorId}`)
      const creatorDoc = await db.collection("users").doc(creatorId).get()
      creatorData = creatorDoc.exists ? creatorDoc.data() : null
      console.log(`✅ [Grant Access] Creator found: ${creatorData?.username || creatorId}`)
    }

    // Check if user already has access
    console.log(`🔍 [Grant Access] Checking existing purchases for user ${decodedToken.uid}`)
    const existingPurchase = await db
      .collection("unifiedPurchases")
      .where("userId", "==", decodedToken.uid)
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
    const purchaseId = `instant_${decodedToken.uid}_${bundleId}_${Date.now()}`
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

    console.log(`📝 [Grant Access] Creating purchase record: ${purchaseId}`)

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

    // Also store in user's purchases subcollection
    await db
      .collection("users")
      .doc(decodedToken.uid)
      .collection("purchases")
      .doc(purchaseId)
      .set({
        ...purchaseData,
        userPurchaseId: purchaseId,
      })
    console.log(`✅ [Grant Access] User purchase record created`)

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
      console.warn(`⚠️ [Grant Access] Failed to update bundle stats:`, error)
    }

    // Record sale for creator
    if (creatorId) {
      try {
        const platformFee = (bundleData.price || 0) * 0.05 // 5% platform fee
        const netAmount = (bundleData.price || 0) - platformFee

        await db
          .collection("users")
          .doc(creatorId)
          .collection("sales")
          .add({
            productBoxId: bundleId,
            buyerUid: decodedToken.uid,
            purchaseId: purchaseId,
            amount: bundleData.price || 0,
            platformFee,
            netAmount,
            purchasedAt: new Date(),
            status: "completed",
            productTitle: bundleData.title || "Untitled Product Box",
            buyerEmail: decodedToken.email || "",
            verificationMethod: verificationMethod,
            instantAccess: true,
          })

        // Update creator stats
        await db
          .collection("users")
          .doc(creatorId)
          .update({
            totalSales: db.FieldValue.increment(1),
            totalRevenue: db.FieldValue.increment(bundleData.price || 0),
            lastSaleAt: new Date(),
          })
        console.log(`✅ [Grant Access] Creator sale recorded`)
      } catch (error) {
        console.warn(`⚠️ [Grant Access] Failed to record creator sale:`, error)
      }
    }

    console.log(`🎉 [Grant Access] INSTANT ACCESS GRANTED SUCCESSFULLY!`)
    console.log(`📝 Purchase ID: ${purchaseId}`)
    console.log(`👤 User: ${decodedToken.uid}`)
    console.log(`📦 Bundle: ${bundleData.title}`)

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
    console.error(`❌ [Grant Access] Stack trace:`, error.stack)
    return NextResponse.json(
      {
        error: error.message || "Failed to grant access",
        success: false,
        details: error.stack,
      },
      { status: 500 },
    )
  }
}

// Also handle GET requests for debugging
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Grant immediate access API is working",
    timestamp: new Date().toISOString(),
    url: request.url,
  })
}
