import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { creatorId: string } }) {
  try {
    const { creatorId } = params

    if (!creatorId) {
      return NextResponse.json({ error: "Creator ID is required" }, { status: 400 })
    }

    console.log(`Fetching free content for creator: ${creatorId}`)

    // Simple query to get free content for this creator
    const freeContentRef = db.collection("free_content")
    const snapshot = await freeContentRef.where("uid", "==", creatorId).get()

    const freeContent = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || "Untitled",
        fileUrl: data.fileUrl || "",
        thumbnailUrl: data.thumbnailUrl || "",
        type: data.type || "video",
        uid: data.uid || "",
        uploadId: data.uploadId || "",
        addedAt: data.addedAt || new Date(),
      }
    })

    console.log(`Found ${freeContent.length} free content items`)
    return NextResponse.json({ freeContent })
  } catch (error) {
    console.error("Error fetching creator free content:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch creator free content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
