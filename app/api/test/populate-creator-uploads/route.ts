import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

export async function POST() {
  try {
    // Sample creator uploads with varying performance metrics
    const sampleUploads = [
      {
        title: "Coding Tips for Beginners",
        description: "Essential coding tips for those just starting out",
        thumbnailUrl: "https://picsum.photos/seed/coding/300/200",
        fileUrl: "https://example.com/videos/coding-tips.mp4",
        views: 1200,
        downloads: 1200, // High downloads (performanceScore = 3600)
        isPublic: true,
        creatorName: "TechGuru",
        creatorId: "creator123",
        tags: ["coding", "tutorial", "beginner"],
      },
      {
        title: "Travel Planning Guide",
        description: "How to plan your next adventure",
        thumbnailUrl: "https://picsum.photos/seed/travel/300/200",
        fileUrl: "https://example.com/videos/travel-guide.mp4",
        views: 900,
        downloads: 900, // High downloads (performanceScore = 2700)
        isPublic: true,
        creatorName: "Wanderlust",
        creatorId: "creator456",
        tags: ["travel", "guide", "planning"],
      },
      {
        title: "Business Growth Strategies",
        description: "Effective strategies for scaling your business",
        thumbnailUrl: "https://picsum.photos/seed/business/300/200",
        fileUrl: "https://example.com/videos/business-growth.mp4",
        views: 730,
        downloads: 730, // Good performance (performanceScore = 2190)
        isPublic: true,
        creatorName: "BizCoach",
        creatorId: "creator789",
        tags: ["business", "growth", "strategy"],
      },
      {
        title: "Fitness Tips for Busy People",
        description: "Stay fit even with a busy schedule",
        thumbnailUrl: "https://picsum.photos/seed/fitness/300/200",
        fileUrl: "https://example.com/videos/fitness-tips.mp4",
        views: 800,
        downloads: 600, // Good performance (performanceScore = 2000)
        isPublic: true,
        creatorName: "FitLife",
        creatorId: "creator101",
        tags: ["fitness", "health", "workout"],
      },
      {
        title: "Art Fundamentals",
        description: "Learn the basics of drawing and painting",
        thumbnailUrl: "https://picsum.photos/seed/art/300/200",
        fileUrl: "https://example.com/videos/art-basics.mp4",
        views: 560,
        downloads: 600, // Good performance (performanceScore = 1760)
        isPublic: true,
        creatorName: "ArtistPro",
        creatorId: "creator202",
        tags: ["art", "drawing", "painting"],
      },
      {
        title: "Cooking for Beginners",
        description: "Simple recipes for novice cooks",
        thumbnailUrl: "https://picsum.photos/seed/cooking/300/200",
        fileUrl: "https://example.com/videos/cooking-basics.mp4",
        views: 450,
        downloads: 300, // Medium performance (performanceScore = 1050)
        isPublic: true,
        creatorName: "ChefMaster",
        creatorId: "creator303",
        tags: ["cooking", "food", "beginner"],
      },
      {
        title: "Photography Essentials",
        description: "Master the basics of photography",
        thumbnailUrl: "https://picsum.photos/seed/photo/300/200",
        fileUrl: "https://example.com/videos/photo-essentials.mp4",
        views: 380,
        downloads: 250, // Medium performance (performanceScore = 880)
        isPublic: true,
        creatorName: "PhotoPro",
        creatorId: "creator404",
        tags: ["photography", "camera", "tutorial"],
      },
      {
        title: "Meditation for Beginners",
        description: "Start your meditation journey",
        thumbnailUrl: "https://picsum.photos/seed/meditation/300/200",
        fileUrl: "https://example.com/videos/meditation-basics.mp4",
        views: 320,
        downloads: 180, // Lower performance (performanceScore = 680)
        isPublic: true,
        creatorName: "ZenMaster",
        creatorId: "creator505",
        tags: ["meditation", "mindfulness", "wellness"],
      },
      {
        title: "Home Gardening Tips",
        description: "Grow your own vegetables and herbs",
        thumbnailUrl: "https://picsum.photos/seed/garden/300/200",
        fileUrl: "https://example.com/videos/gardening-tips.mp4",
        views: 280,
        downloads: 150, // Lower performance (performanceScore = 580)
        isPublic: true,
        creatorName: "GreenThumb",
        creatorId: "creator606",
        tags: ["gardening", "plants", "home"],
      },
      {
        title: "DIY Home Repairs",
        description: "Fix common household problems yourself",
        thumbnailUrl: "https://picsum.photos/seed/diy/300/200",
        fileUrl: "https://example.com/videos/diy-repairs.mp4",
        views: 250,
        downloads: 120, // Lower performance (performanceScore = 490)
        isPublic: true,
        creatorName: "HandyPerson",
        creatorId: "creator707",
        tags: ["DIY", "home", "repair"],
      },
    ]

    // Add each sample upload to the free_content collection
    const freeContentRef = collection(db, "free_content")
    const addedDocs = []

    for (const upload of sampleUploads) {
      const docRef = await addDoc(freeContentRef, {
        ...upload,
        addedAt: serverTimestamp(),
      })
      addedDocs.push(docRef.id)
    }

    return NextResponse.json({
      success: true,
      message: `Added ${addedDocs.length} sample creator uploads`,
      ids: addedDocs,
    })
  } catch (error) {
    console.error("Error populating creator uploads:", error)
    return NextResponse.json({ error: "Failed to populate creator uploads" }, { status: 500 })
  }
}
