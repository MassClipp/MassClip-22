import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { cookies } from "next/headers"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Creator Uploads] Starting request...")

    // Try to get user ID from various sources
    let userId = null

    // Method 1: Try from URL params
    const { searchParams } = new URL(request.url)
    userId = searchParams.get("userId")

    // Method 2: Try from cookies/headers
    if (!userId) {
      const cookieStore = cookies()
      const sessionCookie = cookieStore.get("session")
      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(sessionCookie.value)
          userId = sessionData.uid || sessionData.user?.uid
        } catch (e) {
          console.log("Could not parse session cookie")
        }
      }
    }

    // Method 3: Try from Authorization header
    if (!userId) {
      const authHeader = request.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        userId = authHeader.replace("Bearer ", "")
      }
    }

    console.log("🔍 [Creator Uploads] User ID:", userId)

    if (!userId) {
      console.log("❌ [Creator Uploads] No user ID found")
      // Return empty array instead of error for better UX
      return NextResponse.json({
        success: true,
        videos: [],
        count: 0,
        message: "No user authenticated",
      })
    }

    console.log("🔍 [Creator Uploads] Querying free_content for user:", userId)

    // Query free content
    const freeContentRef = db.collection("free_content")
    const query = freeContentRef.where("uid", "==", userId).limit(50)
    const snapshot = await query.get()

    console.log(`📊 [Creator Uploads] Found ${snapshot.size} documents`)

    const videos = []
    snapshot.forEach((doc) => {
      const data = doc.data()
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
        ...data,
      })
    })

    // Sort by most recent
    videos.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())

    console.log(`✅ [Creator Uploads] Returning ${videos.length} videos`)

    return NextResponse.json({
      success: true,
      videos: videos,
      count: videos.length,
    })
  } catch (error) {
    console.error("❌ [Creator Uploads] Error:", error)

    // Return empty array instead of error for better UX
    return NextResponse.json({
      success: true,
      videos: [],
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
