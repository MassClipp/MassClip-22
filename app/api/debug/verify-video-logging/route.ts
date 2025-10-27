import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productBoxId = searchParams.get("productBoxId")

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID required" }, { status: 400 })
    }

    console.log(`🔍 [Video Logging Diagnostic] Checking product box: ${productBoxId}`)

    // 1. Check product box document
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!
    console.log(`📦 [Product Box Data]:`, {
      title: productBoxData.title,
      contentItems: productBoxData.contentItems?.length || 0,
      contentItemsArray: productBoxData.contentItems,
    })

    // 2. Check productBoxContent collection
    const contentSnapshot = await db.collection("productBoxContent").where("productBoxId", "==", productBoxId).get()

    const contentItems = contentSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`📁 [Product Box Content Collection]:`, {
      count: contentItems.length,
      items: contentItems,
    })

    // 3. Check uploads collection for each content item
    const uploadChecks = []
    if (productBoxData.contentItems?.length > 0) {
      for (const uploadId of productBoxData.contentItems) {
        try {
          const uploadDoc = await db.collection("uploads").doc(uploadId).get()
          if (uploadDoc.exists) {
            const uploadData = uploadDoc.data()!
            uploadChecks.push({
              uploadId,
              exists: true,
              fileName: uploadData.fileName,
              fileType: uploadData.fileType,
              category: uploadData.category,
              fileSize: uploadData.fileSize,
              publicUrl: uploadData.publicUrl,
              downloadUrl: uploadData.downloadUrl,
              isVideo: uploadData.fileType?.includes("video") || uploadData.category === "video",
            })
          } else {
            uploadChecks.push({
              uploadId,
              exists: false,
            })
          }
        } catch (error) {
          uploadChecks.push({
            uploadId,
            exists: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }
    }

    console.log(`📹 [Upload Checks]:`, uploadChecks)

    // 4. Check for any video files specifically
    const videoUploads = uploadChecks.filter((upload) => upload.isVideo)
    console.log(`🎬 [Video Files Found]:`, videoUploads.length)

    // 5. Check creator uploads collection
    let creatorUploads = []
    if (productBoxData.creatorId) {
      try {
        const creatorUploadsSnapshot = await db
          .collection("uploads")
          .where("uid", "==", productBoxData.creatorId)
          .where("category", "==", "video")
          .limit(10)
          .get()

        creatorUploads = creatorUploadsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        console.log(`👤 [Creator Video Uploads]:`, creatorUploads.length)
      } catch (error) {
        console.error("Error fetching creator uploads:", error)
      }
    }

    // 6. Generate recommendations
    const recommendations = []

    if (productBoxData.contentItems?.length === 0) {
      recommendations.push("No content items found in product box. Add content to the product box first.")
    }

    if (contentItems.length === 0 && productBoxData.contentItems?.length > 0) {
      recommendations.push(
        "Content items exist in product box but not synced to productBoxContent collection. Run sync operation.",
      )
    }

    if (videoUploads.length === 0 && uploadChecks.length > 0) {
      recommendations.push("No video files found. All content appears to be documents or other file types.")
    }

    if (uploadChecks.some((upload) => !upload.exists)) {
      recommendations.push("Some upload references are broken. Clean up invalid references.")
    }

    return NextResponse.json({
      success: true,
      productBoxId,
      productBox: {
        title: productBoxData.title,
        creatorId: productBoxData.creatorId,
        contentItemsCount: productBoxData.contentItems?.length || 0,
        contentItems: productBoxData.contentItems || [],
      },
      productBoxContent: {
        count: contentItems.length,
        items: contentItems,
      },
      uploads: {
        total: uploadChecks.length,
        valid: uploadChecks.filter((u) => u.exists).length,
        videos: videoUploads.length,
        checks: uploadChecks,
      },
      creatorUploads: {
        count: creatorUploads.length,
        items: creatorUploads.slice(0, 3), // Show first 3 for reference
      },
      recommendations,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in video logging diagnostic:", error)
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, action } = await request.json()

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID required" }, { status: 400 })
    }

    console.log(`🔧 [Video Logging Fix] Action: ${action} for product box: ${productBoxId}`)

    if (action === "sync-content") {
      // Sync content from contentItems array to productBoxContent collection
      const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
      if (!productBoxDoc.exists) {
        return NextResponse.json({ error: "Product box not found" }, { status: 404 })
      }

      const productBoxData = productBoxDoc.data()!
      const contentItems = productBoxData.contentItems || []

      let syncedCount = 0
      const batch = db.batch()

      for (const uploadId of contentItems) {
        try {
          const uploadDoc = await db.collection("uploads").doc(uploadId).get()
          if (uploadDoc.exists) {
            const uploadData = uploadDoc.data()!

            // Create proper content entry
            const contentRef = db.collection("productBoxContent").doc(`${productBoxId}_${uploadId}`)
            batch.set(contentRef, {
              productBoxId,
              uploadId,
              status: "completed",
              fileName: uploadData.fileName || "Unknown",
              originalFileName: uploadData.originalFileName || uploadData.fileName || "Unknown",
              fileType: uploadData.fileType || "application/octet-stream",
              fileSize: uploadData.fileSize || 0,
              category: uploadData.category || "document",
              publicUrl: uploadData.publicUrl || null,
              downloadUrl: uploadData.downloadUrl || uploadData.publicUrl || null,
              thumbnailUrl: uploadData.thumbnailUrl || null,
              uploadedAt: uploadData.uploadedAt || new Date(),
              createdAt: new Date(),
              creatorId: productBoxData.creatorId,
              // Video-specific fields
              isVideo: uploadData.fileType?.includes("video") || uploadData.category === "video",
              duration: uploadData.duration || null,
              resolution: uploadData.resolution || null,
            })

            syncedCount++
          }
        } catch (error) {
          console.error(`Error processing upload ${uploadId}:`, error)
        }
      }

      await batch.commit()

      return NextResponse.json({
        success: true,
        message: `Synced ${syncedCount} content items to productBoxContent collection`,
        syncedCount,
      })
    }

    if (action === "add-sample-videos") {
      // Add sample video content for testing
      const sampleVideos = [
        {
          fileName: "sample-video-1.mp4",
          originalFileName: "Sample Video 1.mp4",
          fileType: "video/mp4",
          category: "video",
          fileSize: 5242880, // 5MB
          publicUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          isVideo: true,
        },
        {
          fileName: "sample-video-2.mp4",
          originalFileName: "Sample Video 2.mp4",
          fileType: "video/mp4",
          category: "video",
          fileSize: 3145728, // 3MB
          publicUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          isVideo: true,
        },
      ]

      const batch = db.batch()
      let addedCount = 0

      for (const [index, video] of sampleVideos.entries()) {
        const contentRef = db.collection("productBoxContent").doc(`${productBoxId}_sample_${index + 1}`)
        batch.set(contentRef, {
          productBoxId,
          uploadId: `sample_${index + 1}`,
          status: "completed",
          ...video,
          uploadedAt: new Date(),
          createdAt: new Date(),
          thumbnailUrl: `/placeholder.svg?height=200&width=160&text=Video`,
        })
        addedCount++
      }

      await batch.commit()

      return NextResponse.json({
        success: true,
        message: `Added ${addedCount} sample videos for testing`,
        addedCount,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in video logging fix:", error)
    return NextResponse.json(
      {
        error: "Fix operation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
