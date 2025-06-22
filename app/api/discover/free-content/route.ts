import { db } from "@/lib/firebase/firebase"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    console.log("⚡️[Discover Free Content] Request received")

    // Query free_content collection with creator info
    const freeContentSnapshot = await db.collection("free_content").limit(100).get()

    const videos = []
    for (const doc of freeContentSnapshot.docs) {
      const data = doc.data()

      // Get creator information
      let creatorName = "Unknown Creator"
      let creatorUsername = null

      if (data.uid) {
        try {
          const userDoc = await db.collection("users").doc(data.uid).get()
          if (userDoc.exists()) {
            const userData = userDoc.data()
            creatorName = userData.displayName || userData.name || userData.username || "Unknown Creator"
            creatorUsername = userData.username
          }
        } catch (error) {
          console.log("Error fetching creator info:", error)
        }
      }

      videos.push({
        id: doc.id,
        title: data.title || "Untitled",
        fileUrl: data.fileUrl || data.url || "",
        thumbnailUrl: data.thumbnailUrl || data.thumbnail || "",
        type: data.type || "video",
        duration: data.duration || 0,
        size: data.size || 0,
        addedAt: data.addedAt?.toDate?.() || data.addedAt || new Date(),
        uid: data.uid,
        creatorName,
        creatorUsername,
        views: data.views || 0,
        downloads: data.downloads || 0,
        ...data,
      })
    }

    console.log(
      `✅ [Discover Free Content] Returning ${videos.length} videos from ${freeContentSnapshot.size} documents`,
    )

    return NextResponse.json({ videos }, { status: 200 })
  } catch (error) {
    console.error("🔥[Discover Free Content] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
