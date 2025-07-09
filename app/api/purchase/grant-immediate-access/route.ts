import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userId = decodedToken.uid
    const { bundleId, productBoxId, creatorId, verificationMethod } = await request.json()

    // Support both bundleId and productBoxId for compatibility
    const actualBundleId = bundleId || productBoxId

    if (!actualBundleId) {
      return NextResponse.json({ error: "Bundle ID required" }, { status: 400 })
    }

    console.log(`🚀 [Grant Immediate Access] Processing for:`)
    console.log(`   📦 Bundle: ${actualBundleId}`)
    console.log(`   👤 User: ${userId}`)
    console.log(`   🎯 Verification: ${verificationMethod || "landing_page"}`)

    // Get bundle details from bundles collection
    const bundleDoc = await db.collection("bundles").doc(actualBundleId).get()

    if (!bundleDoc.exists) {
      console.error(`❌ [Grant Immediate Access] Bundle not found: ${actualBundleId}`)
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!
    console.log(`✅ [Grant Immediate Access] Found bundle: ${bundleData.title}`)

    // Get creator details
    const creatorDoc = await db.collection("users").doc(bundleData.creatorId).get()
    const creatorData = creatorDoc.exists ? creatorDoc.data() : null

    // Check if user already has access - check both collections for compatibility
    const existingPurchaseQuery1 = await db
      .collection("bundlePurchases")
      .where("buyerUid", "==", userId)
      .where("bundleId", "==", actualBundleId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    const existingPurchaseQuery2 = await db
      .collection("productBoxPurchases")
      .where("buyerUid", "==", userId)
      .where("productBoxId", "==", actualBundleId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    let alreadyPurchased = false

    if (!existingPurchaseQuery1.empty || !existingPurchaseQuery2.empty) {
      console.log(`ℹ️ [Grant Immediate Access] User already has access`)
      alreadyPurchased = true
    } else {
      // Create purchase record immediately - no Stripe verification needed!
      const purchaseData = {
        buyerUid: userId,
        bundleId: actualBundleId,
        productBoxId: actualBundleId, // Keep for compatibility
        creatorId: bundleData.creatorId,
        amount: bundleData.price || 0,
        currency: bundleData.currency || "usd",
        status: "completed", // Immediately completed!
        type: "bundle",
        createdAt: new Date(),
        completedAt: new Date(),
        verificationMethod: verificationMethod || "landing_page", // Simple verification
        notes: "Access granted via landing page verification - no Stripe API verification required",
      }

      // Store in both collections for compatibility
      const purchaseRef1 = await db.collection("bundlePurchases").add(purchaseData)
      const purchaseRef2 = await db.collection("productBoxPurchases").add(purchaseData)

      console.log(`✅ [Grant Immediate Access] Created purchase records: ${purchaseRef1.id}, ${purchaseRef2.id}`)

      // Also add to user's purchases subcollection for easy access
      await db
        .collection("users")
        .doc(userId)
        .collection("purchases")
        .doc(purchaseRef1.id)
        .set({
          ...purchaseData,
          purchaseId: purchaseRef1.id,
        })

      console.log(`✅ [Grant Immediate Access] Added to user's purchase history`)
    }

    // Return success with all the details
    const response = {
      success: true,
      alreadyPurchased,
      bundle: {
        id: actualBundleId,
        title: bundleData.title,
        description: bundleData.description,
        thumbnailUrl: bundleData.thumbnailUrl || bundleData.customPreviewThumbnail,
        price: bundleData.price,
        currency: bundleData.currency || "usd",
      },
      creator: creatorData
        ? {
            id: bundleData.creatorId,
            name: creatorData.displayName || creatorData.name || creatorData.username || "Unknown Creator",
            username: creatorData.username || "",
          }
        : null,
      verificationMethod: verificationMethod || "landing_page",
      message: alreadyPurchased
        ? "Welcome back! You already have access to this content."
        : "🎉 Purchase complete! Access granted immediately - no complex verification needed!",
    }

    console.log(`🎉 [Grant Immediate Access] Success! User now has access to ${bundleData.title}`)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error(`❌ [Grant Immediate Access] Error:`, error)
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
