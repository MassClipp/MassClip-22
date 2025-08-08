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
          
          // Validate and log the video URL
          const fileUrl = data.fileUrl || data.url || ""
          const isValidUrl = fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))
          
          console.log(`🎬 Free Content Item:`, {
            id: doc.id,
            title: data.title,
            fileUrl: fileUrl,
            isValidUrl: isValidUrl,
            thumbnailUrl: data.thumbnailUrl ? "✅" : "❌",
            type: data.type,
            duration: data.duration,
          })

          // Only include items with valid URLs
          if (!isValidUrl) {
            console.warn(`⚠️ Skipping item ${doc.id} - invalid or missing fileUrl:`, fileUrl)
            return null
          }

          return {
            id: doc.id,
            title: data.title || "Untitled Content",
            thumbnailUrl: data.thumbnailUrl || "/placeholder.svg?height=200&width=300",
            fileUrl: fileUrl,
            type: data.type || "video",
            duration: data.duration || "0:00",
            views: data.views || 0,
            description: data.description || "",
            createdAt: data.createdAt || new Date(),
            isPremium: false,
          }
        }).filter(Boolean) // Remove null items

        console.log(`✅ Successfully loaded ${freeContent.length} valid free content items`)

        // Log the final processed items
        freeContent.forEach((item, index) => {
          console.log(`📹 Valid processed item ${index}:`, {
            id: item.id,
            title: item.title,
            fileUrl: item.fileUrl,
            hasValidUrl: !!(item.fileUrl && (item.fileUrl.startsWith('http://') || item.fileUrl.startsWith('https://'))),
          })
        })
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

    console.log(`📊 FINAL RESULT: ${freeContent.length} valid free content items`)

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
