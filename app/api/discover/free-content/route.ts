import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Discover Free Content] Starting request...")

    if (!db) {
      console.error("❌ [Discover Free Content] Database not initialized")
      return NextResponse.json(
        {
          success: true,
          videos: [],
          count: 0,
          error: "Database connection failed",
        },
        { status: 200 },
      )
    }

    // Query ALL free content from all creators - remove limit and add better ordering
    console.log("🔍 [Discover Free Content] Querying free_content collection...")

    const freeContentRef = db.collection("free_content")

    // Try multiple query strategies to get all content
    let snapshot
    try {
      // First try with ordering by addedAt
      snapshot = await freeContentRef.orderBy("addedAt", "desc").get()
      console.log(`📊 [Discover Free Content] Found ${snapshot.size} documents with addedAt ordering`)
    } catch (error) {
      console.log("⚠️ [Discover Free Content] addedAt ordering failed, trying without ordering:", error)
      // If ordering fails (missing index), get all documents without ordering
      snapshot = await freeContentRef.get()
      console.log(`📊 [Discover Free Content] Found ${snapshot.size} documents without ordering`)
    }

    const videos = []
    const userIds = new Set()

    // Collect all unique user IDs first
    snapshot.forEach((doc) => {
      const data = doc.data()
      console.log(`📄 [Discover Free Content] Processing document ${doc.id}:`, {
        title: data.title,
        uid: data.uid,
        hasFileUrl: !!data.fileUrl,
        hasUrl: !!data.url,
      })

      if (data.uid) {
        userIds.add(data.uid)
      }
    })

    console.log(`👥 [Discover Free Content] Found ${userIds.size} unique creators`)

    // Fetch user data for all creators in parallel
    const userDataMap = new Map()
    if (userIds.size > 0) {
      const userPromises = Array.from(userIds).map(async (uid) => {
        try {
          const userDoc = await db
            .collection("users")
            .doc(uid as string)
            .get()
          if (userDoc.exists()) {
            const userData = userDoc.data()
            userDataMap.set(uid, {
              name: userData?.displayName || userData?.name || userData?.username || "Unknown Creator",
              username: userData?.username || null,
            })
            console.log(`👤 [Discover Free Content] Loaded user data for ${uid}:`, userDataMap.get(uid))
          } else {
            console.log(`⚠️ [Discover Free Content] User document not found for ${uid}`)
            userDataMap.set(uid, {
              name: "Unknown Creator",
              username: null,
            })
          }
        } catch (error) {
          console.error(`❌ [Discover Free Content] Error fetching user ${uid}:`, error)
          userDataMap.set(uid, {
            name: "Unknown Creator",
            username: null,
          })
        }
      })

      await Promise.all(userPromises)
    }

    // Process ALL videos with creator information
    snapshot.forEach((doc) => {
      const data = doc.data()
      const creatorData = userDataMap.get(data.uid) || {
        name: "Unknown Creator",
        username: null,
      }

      // Only include videos that have a valid file URL
      const fileUrl = data.fileUrl || data.url || ""
      if (!fileUrl) {
        console.log(`⚠️ [Discover Free Content] Skipping ${doc.id} - no file URL`)
        return
      }

      const video = {
        id: doc.id,
        title: data.title || data.filename || "Untitled",
        fileUrl: fileUrl,
        thumbnailUrl: data.thumbnailUrl || data.thumbnail || "/placeholder.svg?height=200&width=300&text=Video",
        type: data.type || "video",
        duration: data.duration || 0,
        size: data.size || 0,
        addedAt: data.addedAt?.toDate?.() || data.addedAt || new Date(),
        uid: data.uid,
        creatorName: creatorData.name,
        creatorUsername: creatorData.username,
        views: data.views || 0,
        downloads: data.downloads || 0,
        // Include all original data
        ...data,
      }

      videos.push(video)
      console.log(`✅ [Discover Free Content] Added video ${doc.id}: ${video.title} by ${creatorData.name}`)
    })

    // Sort videos by addedAt if available
    videos.sort((a, b) => {
      const dateA = new Date(a.addedAt)
      const dateB = new Date(b.addedAt)
      return dateB.getTime() - dateA.getTime()
    })

    console.log(`✅ [Discover Free Content] Returning ${videos.length} videos total`)
    console.log(
      `📋 [Discover Free Content] Video titles:`,
      videos.map((v) => v.title),
    )

    return NextResponse.json({
      success: true,
      videos: videos,
      count: videos.length,
    })
  } catch (error) {
    console.error("❌ [Discover Free Content] Error:", error)

    return NextResponse.json(
      {
        success: true, // Return success: true to prevent UI errors
        videos: [],
        count: 0,
        error: error instanceof Error ? error.message : "Failed to fetch free content",
      },
      { status: 200 },
    )
  }
}
