import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, action } = await request.json()

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    console.log(`🔧 [Content Fixer] Action: ${action} for product box: ${productBoxId}`)

    const results = {
      action,
      productBoxId,
      success: false,
      details: {},
      timestamp: new Date().toISOString(),
    }

    // Get product box data
    const productBoxRef = db.collection("productBoxes").doc(productBoxId)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()!

    switch (action) {
      case "create_contents_subcollection":
        await createContentsSubcollection(productBoxRef, productBoxData, results)
        break

      case "sync_to_product_box_content":
        await syncToProductBoxContent(productBoxId, productBoxData, results)
        break

      case "fix_content_items_references":
        await fixContentItemsReferences(productBoxId, productBoxData, results)
        break

      case "create_sample_content":
        await createSampleContent(productBoxRef, productBoxId, results)
        break

      case "fix_all":
        await createContentsSubcollection(productBoxRef, productBoxData, results)
        await syncToProductBoxContent(productBoxId, productBoxData, results)
        await fixContentItemsReferences(productBoxId, productBoxData, results)
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error fixing content:", error)
    return NextResponse.json(
      {
        error: "Failed to fix content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function createContentsSubcollection(productBoxRef: any, productBoxData: any, results: any) {
  console.log("📁 Creating contents subcollection...")

  const sampleContents = [
    {
      title: "Premium Video 1",
      fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      thumbnailUrl: "/placeholder.svg?height=200&width=160&text=Video",
      mimeType: "video/mp4",
      size: 15728640, // 15MB
      category: "video",
      duration: 596,
      createdAt: new Date(),
      uploadedAt: new Date(),
    },
    {
      title: "Premium Video 2",
      fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      thumbnailUrl: "/placeholder.svg?height=200&width=160&text=Video",
      mimeType: "video/mp4",
      size: 13631488, // 13MB
      category: "video",
      duration: 653,
      createdAt: new Date(),
      uploadedAt: new Date(),
    },
    {
      title: "Bonus Audio Track",
      fileUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      thumbnailUrl: "/placeholder.svg?height=200&width=160&text=Audio",
      mimeType: "audio/wav",
      size: 1048576, // 1MB
      category: "audio",
      duration: 30,
      createdAt: new Date(),
      uploadedAt: new Date(),
    },
  ]

  const batch = db.batch()
  const contentIds = []

  for (let i = 0; i < sampleContents.length; i++) {
    const contentRef = productBoxRef.collection("contents").doc()
    batch.set(contentRef, sampleContents[i])
    contentIds.push(contentRef.id)
  }

  await batch.commit()

  results.details.contents_subcollection = {
    created: contentIds.length,
    ids: contentIds,
  }

  console.log(`✅ Created ${contentIds.length} content documents in subcollection`)
}

async function syncToProductBoxContent(productBoxId: string, productBoxData: any, results: any) {
  console.log("📦 Syncing to productBoxContent collection...")

  // Get contents from subcollection
  const contentsSnapshot = await db.collection("productBoxes").doc(productBoxId).collection("contents").get()

  if (contentsSnapshot.empty) {
    results.details.sync_error = "No contents found in subcollection"
    return
  }

  const batch = db.batch()
  const syncedIds = []

  for (const doc of contentsSnapshot.docs) {
    const contentData = doc.data()
    const productBoxContentRef = db.collection("productBoxContent").doc(`${productBoxId}_${doc.id}`)

    batch.set(productBoxContentRef, {
      productBoxId,
      contentId: doc.id,
      status: "completed",

      // Required fields for proper rendering
      fileName: contentData.title || contentData.fileName || "Unknown",
      originalFileName: contentData.title || contentData.fileName || "Unknown",
      title: contentData.title || contentData.fileName || "Unknown",

      // File metadata
      fileType: contentData.mimeType || contentData.fileType || "video/mp4",
      fileSize: contentData.size || contentData.fileSize || 0,
      category: contentData.category || "video",

      // URLs - ensure these are properly set
      publicUrl: contentData.fileUrl || contentData.publicUrl || "",
      downloadUrl: contentData.fileUrl || contentData.downloadUrl || contentData.publicUrl || "",
      thumbnailUrl:
        contentData.thumbnailUrl || `/placeholder.svg?height=200&width=160&text=${contentData.category || "Video"}`,

      // Timestamps
      uploadedAt: contentData.uploadedAt || contentData.createdAt || new Date(),
      createdAt: new Date(),

      // Additional metadata
      creatorId: productBoxData.creatorId,
      description: contentData.description,
      duration: contentData.duration,

      // Video detection
      isVideo: contentData.category === "video" || contentData.mimeType?.includes("video"),
    })

    syncedIds.push(doc.id)
  }

  await batch.commit()

  results.details.productBoxContent_sync = {
    synced: syncedIds.length,
    ids: syncedIds,
  }

  console.log(`✅ Synced ${syncedIds.length} items to productBoxContent collection`)
}

async function fixContentItemsReferences(productBoxId: string, productBoxData: any, results: any) {
  console.log("🔗 Fixing contentItems references...")

  if (!productBoxData.contentItems || productBoxData.contentItems.length === 0) {
    results.details.contentItems_error = "No contentItems array found"
    return
  }

  const validItems = []
  const invalidItems = []

  for (const itemId of productBoxData.contentItems) {
    try {
      const uploadDoc = await db.collection("uploads").doc(itemId).get()
      if (uploadDoc.exists) {
        const uploadData = uploadDoc.data()!

        // Create proper content document
        const contentRef = db.collection("productBoxes").doc(productBoxId).collection("contents").doc(itemId)

        await contentRef.set({
          title: uploadData.originalFileName || uploadData.fileName || "Unknown",
          fileUrl: uploadData.publicUrl || uploadData.downloadUrl,
          thumbnailUrl: uploadData.thumbnailUrl,
          mimeType: uploadData.fileType || "application/octet-stream",
          size: uploadData.fileSize || 0,
          category: uploadData.category || "document",
          duration: uploadData.duration,
          createdAt: uploadData.uploadedAt || new Date(),
          uploadedAt: uploadData.uploadedAt || new Date(),
          sourceUploadId: itemId,
        })

        validItems.push(itemId)
      } else {
        invalidItems.push(itemId)
      }
    } catch (error) {
      console.error(`Error processing content item ${itemId}:`, error)
      invalidItems.push(itemId)
    }
  }

  results.details.contentItems_fix = {
    valid: validItems.length,
    invalid: invalidItems.length,
    validIds: validItems,
    invalidIds: invalidItems,
  }

  console.log(`✅ Fixed ${validItems.length} contentItems references`)
}

async function createSampleContent(productBoxRef: any, productBoxId: string, results: any) {
  console.log("🎬 Creating sample content...")

  const sampleContent = {
    title: "Sample Premium Video",
    fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl: "/placeholder.svg?height=200&width=160&text=Sample+Video",
    mimeType: "video/mp4",
    size: 15728640,
    category: "video",
    duration: 596,
    createdAt: new Date(),
    uploadedAt: new Date(),
  }

  // Add to contents subcollection
  const contentRef = productBoxRef.collection("contents").doc()
  await contentRef.set(sampleContent)

  // Add to productBoxContent collection
  const productBoxContentRef = db.collection("productBoxContent").doc(`${productBoxId}_${contentRef.id}`)
  await productBoxContentRef.set({
    productBoxId,
    contentId: contentRef.id,
    status: "completed",
    fileName: sampleContent.title,
    originalFileName: sampleContent.title,
    fileType: sampleContent.mimeType,
    fileSize: sampleContent.size,
    category: sampleContent.category,
    publicUrl: sampleContent.fileUrl,
    downloadUrl: sampleContent.fileUrl,
    thumbnailUrl: sampleContent.thumbnailUrl,
    uploadedAt: sampleContent.uploadedAt,
    createdAt: new Date(),
    title: sampleContent.title,
    duration: sampleContent.duration,
  })

  results.details.sample_content = {
    created: true,
    contentId: contentRef.id,
  }

  console.log(`✅ Created sample content: ${contentRef.id}`)
}
