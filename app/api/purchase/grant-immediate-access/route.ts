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
    const { productBoxId, creatorId, verificationMethod } = await request.json()

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID required" }, { status: 400 })
    }

    console.log(`🚀 [Grant Immediate Access] Processing for:`)
    console.log(`   📦 Product Box: ${productBoxId}`)
    console.log(`   👤 User: ${userId}`)
    console.log(`   🎯 Verification: ${verificationMethod || "landing_page"}`)

    // Get product box details
    let productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists) {
      productBoxDoc = await db.collection("bundles").doc(productBoxId).get()
    }

    if (!productBoxDoc.exists) {
      console.error(`❌ [Grant Immediate Access] Product box not found: ${productBoxId}`)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log(`✅ [Grant Immediate Access] Found product box: ${productBoxData.title}`)

    // Get creator details
    const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
    const creatorData = creatorDoc.exists ? creatorDoc.data() : null

    // Check if user already has access
    const existingPurchaseQuery = await db
      .collection("productBoxPurchases")
      .where("buyerUid", "==", userId)
      .where("productBoxId", "==", productBoxId)
      .where("status", "==", "completed")
      .limit(1)
      .get()

    let alreadyPurchased = false

    if (!existingPurchaseQuery.empty) {
      console.log(`ℹ️ [Grant Immediate Access] User already has access`)
      alreadyPurchased = true
    } else {
      // Create purchase record immediately - no Stripe verification needed!
      const purchaseData = {
        buyerUid: userId,
        productBoxId: productBoxId,
        creatorId: productBoxData.creatorId,
        amount: productBoxData.price || 0,
        currency: productBoxData.currency || "usd",
        status: "completed", // Immediately completed!
        type: "product_box",
        createdAt: new Date(),
        completedAt: new Date(),
        verificationMethod: verificationMethod || "landing_page", // Simple verification
        // No Stripe session ID or payment intent needed!
        notes: "Access granted via landing page verification - no Stripe API verification required",
      }

      const purchaseRef = await db.collection("productBoxPurchases").add(purchaseData)
      console.log(`✅ [Grant Immediate Access] Created purchase record: ${purchaseRef.id}`)

      // Also add to user's purchases subcollection for easy access
      await db
        .collection("users")
        .doc(userId)
        .collection("purchases")
        .doc(purchaseRef.id)
        .set({
          ...purchaseData,
          purchaseId: purchaseRef.id,
        })

      console.log(`✅ [Grant Immediate Access] Added to user's purchase history`)
    }

    // Return success with all the details
    const response = {
      success: true,
      alreadyPurchased,
      productBox: {
        id: productBoxId,
        title: productBoxData.title,
        description: productBoxData.description,
        thumbnailUrl: productBoxData.thumbnailUrl || productBoxData.customPreviewThumbnail,
        price: productBoxData.price,
        currency: productBoxData.currency || "usd",
      },
      creator: creatorData
        ? {
            id: productBoxData.creatorId,
            name: creatorData.displayName || creatorData.name || creatorData.username || "Unknown Creator",
            username: creatorData.username || "",
          }
        : null,
      verificationMethod: verificationMethod || "landing_page",
      message: alreadyPurchased
        ? "Welcome back! You already have access to this content."
        : "🎉 Purchase complete! Access granted immediately - no complex verification needed!",
    }

    console.log(`🎉 [Grant Immediate Access] Success! User now has access to ${productBoxData.title}`)

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
