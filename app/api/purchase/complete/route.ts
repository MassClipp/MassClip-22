import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { buyerUid, productBoxId, sessionId, amount, currency } = await request.json()

    console.log("🔍 [Purchase Complete] Processing:", { buyerUid, productBoxId })

    // Get the product box and its content
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists()) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const productBox = productBoxDoc.data()!
    const contentItems = productBox.contentItems || []

    console.log("📦 [Purchase Complete] Product box content items:", contentItems)

    // Fetch full metadata for each content item
    const contentMetadata = []
    for (const itemId of contentItems) {
      try {
        const uploadDoc = await db.collection("uploads").doc(itemId).get()
        if (uploadDoc.exists()) {
          const uploadData = uploadDoc.data()!

          // Ensure we have complete metadata
          const itemMetadata = {
            id: itemId,
            title: uploadData.title || uploadData.filename || "Untitled",
            fileUrl: uploadData.fileUrl || uploadData.publicUrl || uploadData.downloadUrl,
            thumbnailUrl: uploadData.thumbnailUrl || null,
            mimeType: uploadData.mimeType || "application/octet-stream",
            fileSize: uploadData.fileSize || 0,
            contentType: uploadData.contentType || uploadData.type || uploadData.category || "video",
            filename: uploadData.filename || `${itemId}.mp4`,
          }

          console.log("📄 [Purchase Complete] Item metadata:", itemMetadata)
          contentMetadata.push(itemMetadata)
        } else {
          console.warn(`⚠️ [Purchase Complete] Upload ${itemId} not found`)
        }
      } catch (error) {
        console.error(`❌ [Purchase Complete] Error fetching upload ${itemId}:`, error)
      }
    }

    // Create comprehensive purchase record
    const purchaseData = {
      // Product information
      productBoxId,
      productTitle: productBox.title,
      productDescription: productBox.description,

      // Complete content metadata
      items: contentMetadata,
      contentItems: contentItems, // Keep for backward compatibility

      // Purchase details
      buyerUid,
      amount: amount || productBox.price,
      currency: currency || "usd",
      sessionId,
      status: "completed",
      type: "product_box",

      // Access information
      accessUrl: `/product-box/${productBoxId}/content`,
      coverImage: productBox.coverImage,

      // Timestamps
      purchasedAt: new Date(),
      createdAt: new Date(),
    }

    console.log("💾 [Purchase Complete] Saving purchase data:", purchaseData)

    // Save to main purchases collection
    const purchaseRef = await db.collection("purchases").add(purchaseData)

    // Also save to user's personal purchases with items subcollection
    const userPurchaseRef = await db.collection("users").doc(buyerUid).collection("purchases").add(purchaseData)

    // Store individual items in subcollection for easy access
    for (const item of contentMetadata) {
      await userPurchaseRef.collection("items").doc(item.id).set(item)
    }

    console.log("✅ [Purchase Complete] Purchase saved successfully")

    return NextResponse.json({
      success: true,
      purchase: purchaseData,
      purchaseId: purchaseRef.id,
      message: "Purchase completed and access granted",
    })
  } catch (error) {
    console.error("❌ [Purchase Complete] Error:", error)
    return NextResponse.json({ error: "Failed to complete purchase" }, { status: 500 })
  }
}
