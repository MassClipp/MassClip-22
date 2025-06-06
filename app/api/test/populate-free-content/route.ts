import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [Test] Populating sample free content...")

    // Sample upload data
    const sampleUploads = [
      {
        title: "Coding Tips for Beginners",
        filename: "coding_tips.mp4",
        description: "Essential coding tips every beginner should know",
        thumbnailUrl: "/placeholder.svg?height=1920&width=1080&text=Coding+Tips",
        fileUrl: "https://example.com/coding_tips.mp4",
        views: 1500,
        downloads: 300,
        type: "video",
        tags: ["coding", "programming", "tutorial"],
      },
      {
        title: "Travel Photography Secrets",
        filename: "travel_photo.mp4",
        description: "How to take stunning travel photos",
        thumbnailUrl: "/placeholder.svg?height=1920&width=1080&text=Travel+Photo",
        fileUrl: "https://example.com/travel_photo.mp4",
        views: 800,
        downloads: 150,
        type: "video",
        tags: ["photography", "travel", "tips"],
      },
      {
        title: "Business Growth Strategies",
        filename: "business_growth.mp4",
        description: "Proven strategies to grow your business",
        thumbnailUrl: "/placeholder.svg?height=1920&width=1080&text=Business+Growth",
        fileUrl: "https://example.com/business_growth.mp4",
        views: 1200,
        downloads: 250,
        type: "video",
        tags: ["business", "growth", "strategy"],
      },
      {
        title: "Fitness Workout Routine",
        filename: "fitness_workout.mp4",
        description: "Complete workout routine for beginners",
        thumbnailUrl: "/placeholder.svg?height=1920&width=1080&text=Fitness+Workout",
        fileUrl: "https://example.com/fitness_workout.mp4",
        views: 950,
        downloads: 180,
        type: "video",
        tags: ["fitness", "workout", "health"],
      },
      {
        title: "Art Fundamentals",
        filename: "art_fundamentals.mp4",
        description: "Basic art techniques and principles",
        thumbnailUrl: "/placeholder.svg?height=1920&width=1080&text=Art+Fundamentals",
        fileUrl: "https://example.com/art_fundamentals.mp4",
        views: 600,
        downloads: 120,
        type: "video",
        tags: ["art", "drawing", "tutorial"],
      },
    ]

    const batch = db.batch()
    const createdItems = []

    for (let i = 0; i < sampleUploads.length; i++) {
      const upload = sampleUploads[i]

      // Create upload document
      const uploadRef = db.collection("uploads").doc()
      const uploadData = {
        ...upload,
        uid: `creator_${i + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      batch.set(uploadRef, uploadData)

      // Create free content document
      const freeContentRef = db.collection("free_content").doc()
      const freeContentData = {
        uid: `creator_${i + 1}`,
        uploadId: uploadRef.id,
        title: upload.title,
        fileUrl: upload.fileUrl,
        type: upload.type,
        addedAt: new Date(),
        creatorName: `Creator ${i + 1}`,
      }
      batch.set(freeContentRef, freeContentData)

      createdItems.push({
        uploadId: uploadRef.id,
        freeContentId: freeContentRef.id,
        title: upload.title,
        performanceScore: upload.downloads * 2 + upload.views,
      })
    }

    // Commit the batch
    await batch.commit()

    console.log(`✅ [Test] Created ${createdItems.length} sample free content items`)

    return NextResponse.json({
      success: true,
      message: `Created ${createdItems.length} sample free content items`,
      items: createdItems.map((item) => ({
        title: item.title,
        performanceScore: item.performanceScore,
      })),
    })
  } catch (error) {
    console.error("❌ [Test] Error creating sample free content:", error)
    return NextResponse.json(
      {
        error: "Failed to create sample free content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
