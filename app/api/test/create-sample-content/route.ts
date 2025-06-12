import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"

export async function POST() {
  try {
    console.log("🧪 Creating sample content for testing...")

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    const creatorId = "jus" // The user we're testing with
    const sampleContent = [
      {
        title: "Sample Free Video 1",
        fileUrl: "https://example.com/video1.mp4",
        thumbnailUrl: "https://example.com/thumb1.jpg",
        type: "video",
        uid: creatorId,
        isFree: true,
        price: 0,
        isPremium: false,
        createdAt: new Date(),
        uploadedAt: new Date(),
      },
      {
        title: "Sample Free Video 2",
        fileUrl: "https://example.com/video2.mp4",
        thumbnailUrl: "https://example.com/thumb2.jpg",
        type: "video",
        uid: creatorId,
        isFree: true,
        price: null,
        isPremium: false,
        createdAt: new Date(),
        uploadedAt: new Date(),
      },
      {
        title: "Sample Premium Video",
        fileUrl: "https://example.com/video3.mp4",
        thumbnailUrl: "https://example.com/thumb3.jpg",
        type: "video",
        uid: creatorId,
        isFree: false,
        price: 5.99,
        isPremium: true,
        createdAt: new Date(),
        uploadedAt: new Date(),
      },
    ]

    const results = []

    // Add to uploads collection
    for (const content of sampleContent) {
      const docRef = await db.collection("uploads").add(content)
      results.push({
        collection: "uploads",
        id: docRef.id,
        title: content.title,
        isFree: content.isFree,
      })
      console.log(`✅ Added ${content.title} to uploads collection with ID: ${docRef.id}`)
    }

    // Also add free content to free_content collection
    const freeContent = sampleContent.filter((item) => item.isFree)
    for (const content of freeContent) {
      const docRef = await db.collection("free_content").add({
        ...content,
        uploadId: `upload_${Date.now()}`,
        addedAt: new Date(),
      })
      results.push({
        collection: "free_content",
        id: docRef.id,
        title: content.title,
        isFree: content.isFree,
      })
      console.log(`✅ Added ${content.title} to free_content collection with ID: ${docRef.id}`)
    }

    console.log(`🎉 Successfully created ${results.length} sample content items`)

    return NextResponse.json({
      success: true,
      message: `Created ${results.length} sample content items for user ${creatorId}`,
      results,
      creatorId,
    })
  } catch (error) {
    console.error("❌ Error creating sample content:", error)
    return NextResponse.json(
      {
        error: "Failed to create sample content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
