import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productBoxId = searchParams.get("productBoxId")

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    const db = getAdminDb()

    // Get the product box and its content items
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()
    const contentItems = productBoxData?.contentItems || []

    // Fetch each content item to see the updated metadata
    const contentDetails = []

    for (const itemId of contentItems) {
      const uploadDoc = await db.collection("uploads").doc(itemId).get()
      if (uploadDoc.exists) {
        const data = uploadDoc.data()
        contentDetails.push({
          id: itemId,
          title: data?.title || "No title",
          publicUrl: data?.publicUrl || "No URL",
          downloadUrl: data?.downloadUrl || "No download URL",
          mimeType: data?.mimeType || data?.fileType || "No MIME type",
          fileSize: data?.fileSize || data?.size || "No size",
          category: data?.category || "No category",
          fileName: data?.fileName || "No filename",
          key: data?.key || "No key",
          hasMetadata: !!(data?.title && data?.publicUrl && data?.mimeType),
        })
      } else {
        contentDetails.push({
          id: itemId,
          error: "Upload document not found",
        })
      }
    }

    return NextResponse.json({
      productBoxId,
      productBoxTitle: productBoxData?.title || "Unknown",
      contentItemsCount: contentItems.length,
      contentDetails,
      summary: {
        totalItems: contentDetails.length,
        itemsWithMetadata: contentDetails.filter((item) => item.hasMetadata).length,
        itemsWithUrls: contentDetails.filter((item) => item.publicUrl && item.publicUrl !== "No URL").length,
      },
    })
  } catch (error) {
    console.error("Error verifying sync results:", error)
    return NextResponse.json(
      {
        error: "Failed to verify sync results",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
