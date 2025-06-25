import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId } = await request.json()

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    console.log(`🔧 [URL Fixer] Fixing missing URLs for product box: ${productBoxId}`)

    // Get the product box
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    const contentItems = productBoxData.contentItems || []

    const results = {
      processed: 0,
      fixed: 0,
      errors: 0,
      details: [] as any[],
    }

    // Process each content item
    for (const itemId of contentItems) {
      try {
        results.processed++
        console.log(`🔍 Processing item: ${itemId}`)

        // Get the upload document
        const uploadDoc = await db.collection("uploads").doc(itemId).get()

        if (!uploadDoc.exists) {
          console.log(`❌ Upload ${itemId} not found`)
          results.details.push({
            id: itemId,
            status: "not_found",
            message: "Upload document not found",
          })
          results.errors++
          continue
        }

        const uploadData = uploadDoc.data()!
        console.log(`📄 Upload data:`, {
          fileName: uploadData.fileName,
          publicUrl: uploadData.publicUrl,
          downloadUrl: uploadData.downloadUrl,
          r2Key: uploadData.r2Key,
          r2Url: uploadData.r2Url,
        })

        // Check if URLs are missing
        const hasPublicUrl = uploadData.publicUrl && uploadData.publicUrl.trim() !== ""
        const hasDownloadUrl = uploadData.downloadUrl && uploadData.downloadUrl.trim() !== ""

        if (hasPublicUrl && hasDownloadUrl) {
          console.log(`✅ URLs already exist for ${itemId}`)
          results.details.push({
            id: itemId,
            status: "already_has_urls",
            publicUrl: uploadData.publicUrl,
            downloadUrl: uploadData.downloadUrl,
          })
          continue
        }

        // Try to construct URLs from available data
        let publicUrl = uploadData.publicUrl
        let downloadUrl = uploadData.downloadUrl

        // If we have an r2Key or r2Url, construct the public URL
        if (!publicUrl && uploadData.r2Key) {
          // Construct R2 public URL
          const r2PublicUrl = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL
          if (r2PublicUrl) {
            publicUrl = `${r2PublicUrl}/${uploadData.r2Key}`
            console.log(`🔗 Constructed publicUrl from r2Key: ${publicUrl}`)
          }
        }

        if (!publicUrl && uploadData.r2Url) {
          publicUrl = uploadData.r2Url
          console.log(`🔗 Using r2Url as publicUrl: ${publicUrl}`)
        }

        // Use publicUrl as downloadUrl if downloadUrl is missing
        if (!downloadUrl && publicUrl) {
          downloadUrl = publicUrl
          console.log(`🔗 Using publicUrl as downloadUrl: ${downloadUrl}`)
        }

        // If we still don't have URLs, try to construct from fileName
        if (!publicUrl && uploadData.fileName) {
          const r2PublicUrl = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL
          if (r2PublicUrl) {
            publicUrl = `${r2PublicUrl}/${uploadData.fileName}`
            downloadUrl = publicUrl
            console.log(`🔗 Constructed URL from fileName: ${publicUrl}`)
          }
        }

        // Update the document if we have URLs
        if (publicUrl || downloadUrl) {
          const updateData: any = {}

          if (publicUrl) updateData.publicUrl = publicUrl
          if (downloadUrl) updateData.downloadUrl = downloadUrl

          // Also ensure we have proper metadata
          if (!uploadData.fileType && uploadData.fileName) {
            if (uploadData.fileName.endsWith(".mp4")) {
              updateData.fileType = "video/mp4"
            } else if (uploadData.fileName.endsWith(".mov")) {
              updateData.fileType = "video/quicktime"
            }
          }

          if (!uploadData.category) {
            updateData.category = "video"
          }

          await db.collection("uploads").doc(itemId).update(updateData)

          console.log(`✅ Updated ${itemId} with URLs`)
          results.fixed++
          results.details.push({
            id: itemId,
            status: "fixed",
            publicUrl,
            downloadUrl,
            updates: updateData,
          })
        } else {
          console.log(`❌ Could not construct URLs for ${itemId}`)
          results.details.push({
            id: itemId,
            status: "no_url_data",
            message: "Could not construct URLs from available data",
            availableData: {
              r2Key: uploadData.r2Key,
              r2Url: uploadData.r2Url,
              fileName: uploadData.fileName,
            },
          })
          results.errors++
        }
      } catch (error) {
        console.error(`Error processing ${itemId}:`, error)
        results.errors++
        results.details.push({
          id: itemId,
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    console.log(`🎉 URL fixing complete:`, results)

    return NextResponse.json({
      success: true,
      message: `Fixed ${results.fixed} out of ${results.processed} items`,
      results,
    })
  } catch (error) {
    console.error("Error fixing URLs:", error)
    return NextResponse.json(
      {
        error: "Failed to fix URLs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
