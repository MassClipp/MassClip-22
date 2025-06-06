import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    console.log("🎬 [Create Sample] Creating sample free content...")

    const sampleUploads = [
      {
        title: "Motivational Speech - Never Give Up",
        description: "An inspiring speech about perseverance and determination",
        filename: "motivational-speech-1.mp4",
        thumbnailUrl: "/placeholder.svg?height=720&width=1280",
        videoUrl: "https://example.com/video1.mp4",
        duration: 180,
        views: 1250,
        downloads: 45,
        isFreeContent: true,
        category: "Motivation",
        tags: ["motivation", "inspiration", "success"],
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorId: "sample-creator-1",
        creatorName: "John Motivator",
      },
      {
        title: "Business Success Mindset",
        description: "Key principles for developing a successful business mindset",
        filename: "business-mindset.mp4",
        thumbnailUrl: "/placeholder.svg?height=720&width=1280",
        videoUrl: "https://example.com/video2.mp4",
        duration: 240,
        views: 890,
        downloads: 32,
        isFreeContent: true,
        category: "Business",
        tags: ["business", "mindset", "success", "entrepreneur"],
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorId: "sample-creator-2",
        creatorName: "Sarah Business",
      },
      {
        title: "Daily Habits for Success",
        description: "Simple daily habits that lead to long-term success",
        filename: "daily-habits.mp4",
        thumbnailUrl: "/placeholder.svg?height=720&width=1280",
        videoUrl: "https://example.com/video3.mp4",
        duration: 300,
        views: 2100,
        downloads: 78,
        isFreeContent: true,
        category: "Lifestyle",
        tags: ["habits", "productivity", "success", "daily routine"],
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorId: "sample-creator-3",
        creatorName: "Mike Habits",
      },
      {
        title: "Overcoming Fear and Doubt",
        description: "Strategies to overcome fear and self-doubt",
        filename: "overcome-fear.mp4",
        thumbnailUrl: "/placeholder.svg?height=720&width=1280",
        videoUrl: "https://example.com/video4.mp4",
        duration: 420,
        views: 1680,
        downloads: 56,
        isFreeContent: true,
        category: "Personal Development",
        tags: ["fear", "confidence", "personal growth", "mindset"],
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorId: "sample-creator-4",
        creatorName: "Lisa Confidence",
      },
      {
        title: "The Power of Positive Thinking",
        description: "How positive thinking can transform your life",
        filename: "positive-thinking.mp4",
        thumbnailUrl: "/placeholder.svg?height=720&width=1280",
        videoUrl: "https://example.com/video5.mp4",
        duration: 360,
        views: 3200,
        downloads: 95,
        isFreeContent: true,
        category: "Mindset",
        tags: ["positive thinking", "mindset", "transformation", "happiness"],
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorId: "sample-creator-5",
        creatorName: "David Positive",
      },
    ]

    const batch = db.batch()
    let createdCount = 0

    for (const upload of sampleUploads) {
      const docRef = db.collection("uploads").doc()
      batch.set(docRef, upload)
      createdCount++
      console.log(`✅ [Create Sample] Adding: ${upload.title}`)
    }

    await batch.commit()
    console.log(`🎉 [Create Sample] Successfully created ${createdCount} sample uploads`)

    return NextResponse.json({
      message: `Successfully created ${createdCount} sample free content uploads`,
      createdCount,
      uploads: sampleUploads.map((u) => ({ title: u.title, category: u.category })),
    })
  } catch (error) {
    console.error("❌ [Create Sample] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to create sample content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
