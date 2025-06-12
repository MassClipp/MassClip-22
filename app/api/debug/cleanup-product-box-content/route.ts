import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, action } = await request.json()

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    console.log(`🧹 [Cleanup] Action: ${action} for product box: ${productBoxId}`)

    const results = {
      action,
      productBoxId,
      success: false,
      details: {},
      timestamp: new Date().toISOString(),
    }

    switch (action) {
      case "cleanup_broken_records":
        await cleanupBrokenRecords(productBoxId, results)
        break

      case "full_cleanup_and_rebuild":
        await fullCleanupAndRebuild(productBoxId, results)
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    results.success = true
    return NextResponse.json(results)
  } catch (error) {
    console.error("Error during cleanup:", error)
    return NextResponse.json(
      {
        error: "Failed to cleanup content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function cleanupBrokenRecords(productBoxId: string, results: any) {
  console.log("🗑️ Cleaning up broken records...")

  // Get all productBoxContent records for this product box
  const productBoxContentSnapshot = await db
    .collection("productBoxContent")
    .where("productBoxId", "==", productBoxId)
    .get()

  const brokenRecords = []
  const validRecords = []

  for (const doc of productBoxContentSnapshot.docs) {
    const data = doc.data()

    // Check if record is missing critical fields
    const isBroken = !data.fileUrl || !data.mimeType || !data.fileSize || data.fileName === "Unknown" || !data.fileName

    if (isBroken) {
      brokenRecords.push(doc.id)
    } else {
      validRecords.push(doc.id)
    }
  }

  // Delete broken records in batches
  const batch = db.batch()
  for (const recordId of brokenRecords) {
    const recordRef = db.collection("productBoxContent").doc(recordId)
    batch.delete(recordRef)
  }

  await batch.commit()

  results.details.cleanup = {
    brokenRecordsDeleted: brokenRecords.length,
    validRecordsKept: validRecords.length,
    deletedIds: brokenRecords,
  }

  console.log(`✅ Deleted ${brokenRecords.length} broken records, kept ${validRecords.length} valid records`)
}

async function fullCleanupAndRebuild(productBoxId: string, results: any) {
  console.log("🔄 Full cleanup and rebuild...")

  // Step 1: Delete ALL existing productBoxContent records for this product box
  const existingRecordsSnapshot = await db
    .collection("productBoxContent")
    .where("productBoxId", "==", productBoxId)
    .get()

  const deleteBatch = db.batch()
  const deletedIds = []

  for (const doc of existingRecordsSnapshot.docs) {
    deleteBatch.delete(doc.ref)
    deletedIds.push(doc.id)
  }

  await deleteBatch.commit()

  console.log(`🗑️ Deleted ${deletedIds.length} existing records`)

  // Step 2: Get product box data
  const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
  if (!productBoxDoc.exists) {
    throw new Error("Product box not found")
  }

  const productBoxData = productBoxDoc.data()!

  // Step 3: Check if contents subcollection exists and has data
  const contentsSnapshot = await db.collection("productBoxes").doc(productBoxId).collection("contents").get()

  const newRecords = []

  if (!contentsSnapshot.empty) {
    // Rebuild from contents subcollection
    console.log("📁 Rebuilding from contents subcollection...")

    const createBatch = db.batch()

    for (const contentDoc of contentsSnapshot.docs) {
      const contentData = contentDoc.data()
      const newRecordId = `${productBoxId}_${contentDoc.id}`
      const newRecordRef = db.collection("productBoxContent").doc(newRecordId)

      const newRecord = {
        productBoxId,
        contentId: contentDoc.id,
        status: "completed",

        // Required fields
        fileName: contentData.title || "Unknown",
        originalFileName: contentData.title || "Unknown",
        title: contentData.title || "Unknown",

        // File metadata
        fileType: contentData.mimeType || "video/mp4",
        fileSize: contentData.size || 15728640,
        category: contentData.category || "video",

        // URLs
        publicUrl:
          contentData.fileUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        downloadUrl:
          contentData.fileUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        thumbnailUrl:
          contentData.thumbnailUrl || `/placeholder.svg?height=200&width=160&text=${contentData.category || "Video"}`,

        // Timestamps
        uploadedAt: contentData.uploadedAt || new Date(),
        createdAt: new Date(),

        // Additional metadata
        creatorId: productBoxData.creatorId,
        description: contentData.description,
        duration: contentData.duration || 596,

        // Video detection
        isVideo: contentData.category === "video" || contentData.mimeType?.includes("video"),
      }

      createBatch.set(newRecordRef, newRecord)
      newRecords.push(newRecordId)
    }

    await createBatch.commit()
  } else {
    // Create sample content if no contents subcollection exists
    console.log("🎬 Creating sample content...")

    const sampleContents = [
      {
        title: "Premium Video 1",
        fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        thumbnailUrl: "/placeholder.svg?height=200&width=160&text=Video+1",
        mimeType: "video/mp4",
        size: 15728640,
        category: "video",
        duration: 596,
      },
      {
        title: "Premium Video 2",
        fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        thumbnailUrl: "/placeholder.svg?height=200&width=160&text=Video+2",
        mimeType: "video/mp4",
        size: 13631488,
        category: "video",
        duration: 653,
      },
      {
        title: "Premium Video 3",
        fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        thumbnailUrl: "/placeholder.svg?height=200&width=160&text=Video+3",
        mimeType: "video/mp4",
        size: 12582912,
        category: "video",
        duration: 15,
      },
    ]

    const createBatch = db.batch()

    for (let i = 0; i < sampleContents.length; i++) {
      const content = sampleContents[i]
      const contentId = `sample_${i + 1}`
      const newRecordId = `${productBoxId}_${contentId}`
      const newRecordRef = db.collection("productBoxContent").doc(newRecordId)

      const newRecord = {
        productBoxId,
        contentId,
        status: "completed",

        // Required fields
        fileName: content.title,
        originalFileName: content.title,
        title: content.title,

        // File metadata
        fileType: content.mimeType,
        fileSize: content.size,
        category: content.category,

        // URLs
        publicUrl: content.fileUrl,
        downloadUrl: content.fileUrl,
        thumbnailUrl: content.thumbnailUrl,

        // Timestamps
        uploadedAt: new Date(),
        createdAt: new Date(),

        // Additional metadata
        creatorId: productBoxData.creatorId,
        duration: content.duration,

        // Video detection
        isVideo: true,
      }

      createBatch.set(newRecordRef, newRecord)
      newRecords.push(newRecordId)

      // Also create in contents subcollection
      const contentsRef = db.collection("productBoxes").doc(productBoxId).collection("contents").doc(contentId)
      createBatch.set(contentsRef, {
        ...content,
        createdAt: new Date(),
        uploadedAt: new Date(),
      })
    }

    await createBatch.commit()
  }

  results.details.rebuild = {
    deletedRecords: deletedIds.length,
    createdRecords: newRecords.length,
    newRecordIds: newRecords,
    source: contentsSnapshot.empty ? "sample_content" : "contents_subcollection",
  }

  console.log(
    `✅ Rebuilt ${newRecords.length} records from ${contentsSnapshot.empty ? "sample content" : "contents subcollection"}`,
  )
}
