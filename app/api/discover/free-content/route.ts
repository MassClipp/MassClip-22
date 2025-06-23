import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Discover Free Content] Starting fresh request...")

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

    // Query the free_content collection directly - get ALL documents
    console.log("🔍 [Discover Free Content] Querying free_content collection...")

    const freeContentRef = db.collection("free_content")

    // Get all documents from free_content collection
    const snapshot = await freeContentRef.get()

    console.log(`📊 [Discover Free Content] Found ${snapshot.size} total documents in free_content`)

    if (snapshot.empty) {
      console.log("⚠️ [Discover Free Content] No documents found in free_content collection")
      return NextResponse.json({
        success: true,
        videos: [],
        count: 0,
        message: "No free content found",
      })
    }

    const videos = []
    const userIds = new Set()

    // First pass: collect all user IDs and log document data
    snapshot.forEach((doc) => {
      const data = doc.data()
      console.log(`📄 [Discover Free Content] Document ${doc.id}:`, {
        title: data.title,
        uid: data.uid,
        hasFileUrl: !!data.fileUrl,
        addedAt: data.addedAt,
        sourceCollection: data.sourceCollection,
      })

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
              name: userData?.displayName || userData?.name || userData?.username || "Unknown Creator",
              username: userData?.username || null,
            })
          } else {
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

    // Second pass: process ALL videos with creator information
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

      // Handle date properly
      let addedAtDate = new Date()
      try {
        if (data.addedAt) {
          if (data.addedAt.toDate && typeof data.addedAt.toDate === "function") {
            addedAtDate = data.addedAt.toDate()
          } else if (data.addedAt instanceof Date) {
            addedAtDate = data.addedAt
          } else {
            addedAtDate = new Date(data.addedAt)
          }
        }
      } catch (dateError) {
        console.log(`⚠️ [Discover Free Content] Date parsing error for ${doc.id}:`, dateError)
        addedAtDate = new Date()
      }

      const video = {
        id: doc.id,
        title: data.title || data.filename || "Untitled",
        fileUrl: fileUrl,
        thumbnailUrl: data.thumbnailUrl || data.thumbnail || "/placeholder.svg?height=200&width=300&text=Video",
        type: data.type || "video",
        duration: data.duration || 0,
        size: data.size || 0,
        addedAt: addedAtDate,
        uid: data.uid,
        creatorName: creatorData.name,
        creatorUsername: creatorData.username,
        views: data.views || 0,
        downloads: data.downloads || 0,
        originalId: data.originalId,
        sourceCollection: data.sourceCollection,
      }

      videos.push(video)
      console.log(`✅ [Discover Free Content] Added video: ${video.title} by ${creatorData.name}`)
    })

    // Sort by addedAt (newest first)
    videos.sort((a, b) => {
      const timeA = new Date(a.addedAt).getTime()
      const timeB = new Date(b.addedAt).getTime()
      return timeB - timeA
    })

    console.log(`✅ [Discover Free Content] Returning ${videos.length} videos total`)

    return NextResponse.json({
      success: true,
      videos: videos,
      count: videos.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ [Discover Free Content] Error:", error)

    return NextResponse.json(
      {
        success: true,
        videos: [],
        count: 0,
        error: error instanceof Error ? error.message : "Failed to fetch free content",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  }
}
