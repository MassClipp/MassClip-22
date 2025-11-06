import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST() {
  try {
    console.log("🔧 [Sample Content] Creating sample content to trigger index creation...")

    // Create sample content that will trigger the index creation
    const sampleContent = [
      {
        productBoxId: "sample_box_1",
        status: "completed",
        fileName: "sample_video.mp4",
        fileType: "video",
        fileSize: 1024000,
        downloadUrl: "https://example.com/sample.mp4",
        uploadedAt: new Date(),
        createdAt: new Date(),
      },
      {
        productBoxId: "sample_box_2",
        status: "completed",
        fileName: "sample_audio.mp3",
        fileType: "audio",
        fileSize: 512000,
        downloadUrl: "https://example.com/sample.mp3",
        uploadedAt: new Date(),
        createdAt: new Date(),
      },
      {
        productBoxId: "sample_box_3",
        status: "processing",
        fileName: "sample_image.jpg",
        fileType: "image",
        fileSize: 256000,
        uploadedAt: new Date(),
        createdAt: new Date(),
      },
    ]

    // Add sample documents
    const promises = sampleContent.map((content) => db.collection("productBoxContent").add(content))

    const results = await Promise.all(promises)
    console.log(`✅ [Sample Content] Created ${results.length} sample documents`)

    // Wait a moment for Firestore to process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Try the query that requires the index
    try {
      const testQuery = await db
        .collection("productBoxContent")
        .where("productBoxId", "==", "sample_box_1")
        .where("status", "==", "completed")
        .orderBy("uploadedAt", "desc")
        .limit(1)
        .get()

      console.log("✅ [Sample Content] Query successful - index is working!")

      return NextResponse.json({
        success: true,
        message: "Index created successfully by adding sample content!",
        details: `Created ${results.length} sample documents and verified the index works.`,
        sampleDocsCreated: results.length,
      })
    } catch (queryError) {
      console.log("⚠️ [Sample Content] Query still failing:", queryError)

      return NextResponse.json({
        success: false,
        message: "Sample content created but index still needed",
        details: "The query still requires manual index creation in Firebase Console",
        sampleDocsCreated: results.length,
      })
    }
  } catch (error) {
    console.error("❌ [Sample Content] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create sample content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
