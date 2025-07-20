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

    try {
      console.log("📁 Checking free_content collection...")
      const freeContentRef = db.collection("free_content")
      const snapshot = await freeContentRef.where("uid", "==", creatorId).get()

      console.log(`📊 Found ${snapshot.size} free content items`)

      if (!snapshot.empty) {
        freeContent = snapshot.docs.map((doc) => {
          const data = doc.data()
          console.log(`🎬 Free Content:`, {
            id: doc.id,
            title: data.title,
            thumbnailUrl: data.thumbnailUrl ? "✅" : "❌",
          })

          return {
            id: doc.id,
            title: data.title || "Untitled Content",
            thumbnailUrl: data.thumbnailUrl || "/placeholder.svg?height=200&width=300",
            type: data.type || "video",
            duration: data.duration || "0:00",
            views: data.views || 0,
            description: data.description || "",
            createdAt: data.createdAt || new Date(),
            isPremium: false,
          }
        })

        console.log(`✅ Successfully loaded ${freeContent.length} free content items`)
      } else {
        console.log("ℹ️ No free content found")
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
      content: freeContent,
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
