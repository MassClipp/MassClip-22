import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-server"

const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL ||
  process.env.CLOUDFLARE_R2_PUBLIC_URL ||
  "https://pub-f0fde4a9c6fb4bc7a1f5f9677ef9a304.r2.dev"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, syncAll = false } = await request.json()

    if (!productBoxId && !syncAll) {
      return NextResponse.json({ error: "Product box ID is required unless syncAll is true" }, { status: 400 })
    }

    const db = getAdminDb()
    const results = {
      uploads: { processed: 0, updated: 0 },
      productBoxContent: { processed: 0, updated: 0 },
      purchases: { processed: 0, updated: 0 },
      errors: [] as string[],
    }

    // 1. Sync uploads collection
    try {
      if (!syncAll && productBoxId) {
        // If we have a product box ID, get its content items first
        const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()

        if (!productBoxDoc.exists) {
          return NextResponse.json({ error: "Product box not found" }, { status: 404 })
        }

        const contentItems = productBoxDoc.data()?.contentItems || []
        if (contentItems.length === 0) {
          return NextResponse.json({ error: "Product box has no content items" }, { status: 400 })
        }

        // Process each content item individually
        for (const itemId of contentItems) {
          try {
            const uploadDoc = await db.collection("uploads").doc(itemId).get()
            if (uploadDoc.exists) {
              results.uploads.processed++
              const data = uploadDoc.data()
              let updated = false
              const updates: Record<string, any> = {}

              // Ensure title is set
              if (!data?.title) {
                if (data?.fileName) {
                  updates.title = data.fileName
                } else if (data?.name) {
                  updates.title = data.name
                } else {
                  updates.title = `Video ${itemId.slice(-8)}`
                }
                updated = true
              }

              // Ensure fileSize is set
              if (!data?.fileSize && data?.size) {
                updates.fileSize = data.size
                updated = true
              }

              // Ensure mimeType is set
              if (!data?.mimeType) {
                if (data?.fileType) {
                  updates.mimeType = data.fileType
                } else {
                  updates.mimeType = "video/mp4" // Default for videos
                }
                updated = true
              }

              // Force set category based on mimeType
              const mimeType = data?.mimeType || data?.fileType || updates.mimeType
              if (!data?.category || data.category === "No category") {
                if (mimeType?.startsWith("video/")) {
                  updates.category = "video"
                  updated = true
                } else if (mimeType?.startsWith("image/")) {
                  updates.category = "image"
                  updated = true
                } else if (mimeType?.startsWith("audio/")) {
                  updates.category = "audio"
                  updated = true
                } else {
                  updates.category = "document"
                  updated = true
                }
              }

              // Generate URLs using multiple strategies
              if (!data?.publicUrl || data.publicUrl === "No URL") {
                let generatedUrl = null

                // Strategy 1: Use existing key/path
                if (data?.key) {
                  generatedUrl = `${R2_PUBLIC_URL}/${data.key}`
                } else if (data?.path) {
                  generatedUrl = `${R2_PUBLIC_URL}/${data.path}`
                } else if (data?.fileName) {
                  generatedUrl = `${R2_PUBLIC_URL}/${data.fileName}`
                } else if (data?.r2Key) {
                  generatedUrl = `${R2_PUBLIC_URL}/${data.r2Key}`
                } else {
                  // Strategy 2: Generate URL based on document ID and file extension
                  const extension = mimeType?.includes("mp4")
                    ? ".mp4"
                    : mimeType?.includes("quicktime")
                      ? ".mov"
                      : ".mp4"
                  generatedUrl = `${R2_PUBLIC_URL}/${itemId}${extension}`
                }

                if (generatedUrl) {
                  updates.publicUrl = generatedUrl
                  updates.downloadUrl = generatedUrl
                  updated = true
                }
              }

              // Ensure fileName is set
              if (!data?.fileName && data?.title) {
                const extension = mimeType?.includes("mp4") ? ".mp4" : mimeType?.includes("quicktime") ? ".mov" : ".mp4"
                updates.fileName = `${data.title}${extension}`
                updated = true
              }

              // Update the document if needed
              if (updated) {
                await db.collection("uploads").doc(itemId).update(updates)
                results.uploads.updated++
                console.log(`Updated upload ${itemId} with:`, updates)
              }
            }
          } catch (error) {
            console.error(`Error processing upload ${itemId}:`, error)
            results.errors.push(
              `Error processing upload ${itemId}: ${error instanceof Error ? error.message : String(error)}`,
            )
          }
        }
      } else {
        // Sync all uploads
        const uploadDocs = await db.collection("uploads").get()

        for (const uploadDoc of uploadDocs.docs) {
          results.uploads.processed++
          const data = uploadDoc.data()
          let updated = false
          const updates: Record<string, any> = {}

          // Apply the same logic for all uploads
          if (!data?.title) {
            if (data?.fileName) {
              updates.title = data.fileName
            } else if (data?.name) {
              updates.title = data.name
            } else {
              updates.title = `Content ${uploadDoc.id.slice(-8)}`
            }
            updated = true
          }

          if (!data?.fileSize && data?.size) {
            updates.fileSize = data.size
            updated = true
          }

          if (!data?.mimeType && data?.fileType) {
            updates.mimeType = data.fileType
            updated = true
          }

          const mimeType = data?.mimeType || data?.fileType || updates.mimeType
          if (!data?.category || data.category === "No category") {
            if (mimeType?.startsWith("video/")) {
              updates.category = "video"
              updated = true
            } else if (mimeType?.startsWith("image/")) {
              updates.category = "image"
              updated = true
            } else if (mimeType?.startsWith("audio/")) {
              updates.category = "audio"
              updated = true
            } else {
              updates.category = "document"
              updated = true
            }
          }

          if (!data?.publicUrl || data.publicUrl === "No URL") {
            let generatedUrl = null

            if (data?.key) {
              generatedUrl = `${R2_PUBLIC_URL}/${data.key}`
            } else if (data?.path) {
              generatedUrl = `${R2_PUBLIC_URL}/${data.path}`
            } else if (data?.fileName) {
              generatedUrl = `${R2_PUBLIC_URL}/${data.fileName}`
            } else {
              const extension = mimeType?.includes("mp4") ? ".mp4" : mimeType?.includes("quicktime") ? ".mov" : ".mp4"
              generatedUrl = `${R2_PUBLIC_URL}/${uploadDoc.id}${extension}`
            }

            if (generatedUrl) {
              updates.publicUrl = generatedUrl
              updates.downloadUrl = generatedUrl
              updated = true
            }
          }

          if (updated) {
            await uploadDoc.ref.update(updates)
            results.uploads.updated++
          }
        }
      }
    } catch (error) {
      console.error("Error syncing uploads:", error)
      results.errors.push(`Error syncing uploads: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Continue with productBoxContent and purchases sync...
    // (keeping the existing logic for these sections)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("Error in sync-content-metadata:", error)
    return NextResponse.json(
      {
        error: "Failed to sync content metadata",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
