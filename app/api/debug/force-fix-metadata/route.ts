import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-server"

const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL ||
  process.env.CLOUDFLARE_R2_PUBLIC_URL ||
  "https://pub-f0fde4a9c6fb4bc7a1f5f9677ef9a304.r2.dev"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId } = await request.json()

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    const db = getAdminDb()
    const results = {
      processed: 0,
      updated: 0,
      errors: [] as string[],
      details: [] as any[],
    }

    // Get the product box and its content items
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const contentItems = productBoxDoc.data()?.contentItems || []
    if (contentItems.length === 0) {
      return NextResponse.json({ error: "Product box has no content items" }, { status: 400 })
    }

    // Process each content item and force-fix the metadata
    for (const itemId of contentItems) {
      try {
        const uploadDoc = await db.collection("uploads").doc(itemId).get()
        if (uploadDoc.exists) {
          results.processed++
          const data = uploadDoc.data()
          const updates: Record<string, any> = {}

          // Force set category to "video" since all items appear to be videos
          updates.category = "video"

          // Generate public URL using the document ID
          const mimeType = data?.mimeType || data?.fileType || "video/mp4"
          const extension = mimeType.includes("quicktime") ? ".mov" : ".mp4"
          const fileName = data?.fileName || data?.title || `video_${itemId.slice(-8)}`

          // Try multiple URL generation strategies
          let publicUrl = null

          if (data?.key) {
            publicUrl = `${R2_PUBLIC_URL}/${data.key}`
          } else if (data?.path) {
            publicUrl = `${R2_PUBLIC_URL}/${data.path}`
          } else if (data?.fileName) {
            publicUrl = `${R2_PUBLIC_URL}/${data.fileName}`
          } else {
            // Use the document ID as the file key
            publicUrl = `${R2_PUBLIC_URL}/${itemId}${extension}`
          }

          updates.publicUrl = publicUrl
          updates.downloadUrl = publicUrl

          // Ensure other required fields are set
          if (!data?.title) {
            updates.title = fileName.replace(/\.[^/.]+$/, "") // Remove extension
          }

          if (!data?.mimeType) {
            updates.mimeType = mimeType
          }

          // Update the document
          await db.collection("uploads").doc(itemId).update(updates)
          results.updated++

          results.details.push({
            id: itemId,
            title: updates.title || data?.title,
            category: updates.category,
            publicUrl: updates.publicUrl,
            mimeType: updates.mimeType || data?.mimeType,
            fileSize: data?.fileSize || data?.size,
          })

          console.log(`Force-fixed upload ${itemId}:`, updates)
        }
      } catch (error) {
        console.error(`Error force-fixing upload ${itemId}:`, error)
        results.errors.push(
          `Error processing upload ${itemId}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("Error in force-fix-metadata:", error)
    return NextResponse.json(
      {
        error: "Failed to force-fix metadata",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
