import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`[Preview API] Fetching preview for product box: ${params.id}`)

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get the product box
    const productBoxRef = db.collection("product_boxes").doc(params.id)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      console.log(`[Preview API] Product box not found: ${params.id}`)
      return NextResponse.json({ success: false, error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()
    console.log(`[Preview API] Found product box: ${productBoxData?.title}`)

    // Get the creator info
    let creatorData = null
    if (productBoxData?.creatorId) {
      const creatorDoc = await db.collection("users").doc(productBoxData.creatorId).get()
      if (creatorDoc.exists) {
        creatorData = creatorDoc.data()
      }
    }

    // Get content items for this product box
    const contentQuery = db
      .collection("product_box_content")
      .where("productBoxId", "==", params.id)
      .orderBy("createdAt", "desc")

    const contentSnapshot = await contentQuery.get()
    const contentItems = contentSnapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || data.originalFileName || data.fileName || "Untitled",
          fileUrl: data.fileUrl || data.publicUrl,
          thumbnailUrl: data.thumbnailUrl,
          mimeType: data.fileType || data.mimeType || "application/octet-stream",
          fileSize: data.fileSize || 0,
          duration: data.duration,
          contentType: data.fileType?.startsWith("video/")
            ? "video"
            : data.fileType?.startsWith("audio/")
              ? "audio"
              : data.fileType?.startsWith("image/")
                ? "image"
                : "document",
        }
      })
      .filter((item) => item.fileUrl) // Only include items with valid URLs

    console.log(`[Preview API] Found ${contentItems.length} content items`)

    // Build the response
    const productBox = {
      id: params.id,
      title: productBoxData?.title || "Untitled Product Box",
      description: productBoxData?.description || "",
      price: productBoxData?.price || 0,
      thumbnailUrl: productBoxData?.thumbnailUrl,
      creatorId: productBoxData?.creatorId,
      creatorName: creatorData?.displayName || creatorData?.name || "Unknown Creator",
      creatorUsername: creatorData?.username || "unknown",
      content: contentItems,
      totalItems: contentItems.length,
      createdAt: productBoxData?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      productBox,
    })
  } catch (error) {
    console.error("[Preview API] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to load preview" }, { status: 500 })
  }
}
