import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { creatorId: string } }) {
  try {
    const { creatorId } = params

    if (!creatorId) {
      return NextResponse.json({ error: "Creator ID is required" }, { status: 400 })
    }

    console.log(`🔍 Fetching FREE CONTENT for creator: ${creatorId}`)

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    let freeContent: any[] = []

    // Check the free_content collection - this is where users explicitly add content
    // from their /dashboard/free-content page
    try {
      console.log("📁 Checking free_content collection...")
      const freeContentRef = db.collection("free_content")
      const snapshot = await freeContentRef.where("uid", "==", creatorId).get()

      console.log(`📊 Found ${snapshot.size} documents in free_content collection`)

      if (!snapshot.empty) {
        freeContent = snapshot.docs.map((doc) => {
          const data = doc.data()
          console.log(`📄 Free content item:`, {
            id: doc.id,
            title: data.title,
            type: data.type,
            fileUrl: data.fileUrl ? "✅" : "❌",
            thumbnailUrl: data.thumbnailUrl ? "✅" : "❌",
          })

          return {
            id: doc.id,
            title: data.title || "Untitled",
            fileUrl: data.fileUrl || "",
            thumbnailUrl: data.thumbnailUrl || "",
            type: data.type || "video",
            uid: data.uid || "",
            uploadId: data.uploadId || "",
            addedAt: data.addedAt || new Date(),
            views: data.views || 0,
            downloads: data.downloads || 0,
          }
        })

        console.log(`✅ Successfully loaded ${freeContent.length} free content items`)
      } else {
        console.log("ℹ️ No items found in free_content collection")
      }
    } catch (error) {
      console.error("❌ Error checking free_content collection:", error)
      return NextResponse.json(
        {
          error: "Failed to fetch free content",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    console.log(`📊 FINAL RESULT: ${freeContent.length} free content items`)

    return NextResponse.json({
      freeContent,
      totalFound: freeContent.length,
      creatorId,
      source: "free_content_collection",
    })
  } catch (error) {
    console.error("❌ FREE CONTENT API ERROR:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch creator free content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
