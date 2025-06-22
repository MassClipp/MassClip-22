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
          success: false,
          videos: [],
          count: 0,
          error: "Database connection failed",
        },
        { status: 500 },
      )
    }

    // Query all free content from all creators
    console.log("🔍 [Discover Free Content] Querying free_content collection...")

    const freeContentRef = db.collection("free_content")
    const snapshot = await freeContentRef.orderBy("addedAt", "desc").limit(100).get()

    console.log(`📊 [Discover Free Content] Found ${snapshot.size} documents`)

    const videos = []
    const userIds = new Set()

    // Collect all unique user IDs
    snapshot.forEach((doc) => {
      const data = doc.data()
      if (data.uid) {
        userIds.add(data.uid)
      }
    })

    console.log(`👥 [Discover Free Content] Found ${userIds.size} unique creators`)

    // Fetch user data for all creators
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
              name: userData?.displayName || userData?.name || "Unknown Creator",
              username: userData?.username || null,
            })
          }
        } catch (error) {
          console.error(`Error fetching user ${uid}:`, error)
          userDataMap.set(uid, {
            name: "Unknown Creator",
            username: null,
          })
        }
      })

      await Promise.all(userPromises)
    }

    // Process videos with creator information
    snapshot.forEach((doc) => {
      const data = doc.data()
      const creatorData = userDataMap.get(data.uid) || {
        name: "Unknown Creator",
        username: null,
      }

      videos.push({
        id: doc.id,
        title: data.title || "Untitled",
        fileUrl: data.fileUrl || data.url || "",
        thumbnailUrl: data.thumbnailUrl || data.thumbnail || "/placeholder.svg?height=200&width=300&text=Video",
        type: data.type || "video",
        duration: data.duration || 0,
        size: data.size || 0,
        addedAt: data.addedAt?.toDate?.() || data.addedAt || new Date(),
        uid: data.uid,
        creatorName: creatorData.name,
        creatorUsername: creatorData.username,
        ...data,
      })
    })

    console.log(`✅ [Discover Free Content] Returning ${videos.length} videos`)

    return NextResponse.json({
      success: true,
      videos: videos,
      count: videos.length,
    })
  } catch (error) {
    console.error("❌ [Discover Free Content] Error:", error)

    return NextResponse.json(
      {
        success: false,
        videos: [],
        count: 0,
        error: error instanceof Error ? error.message : "Failed to fetch free content",
      },
      { status: 500 },
    )
  }
}
