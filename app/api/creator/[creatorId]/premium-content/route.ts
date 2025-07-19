import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { creatorId: string } }) {
  try {
    const { creatorId } = params

    console.log(`[API] Fetching premium content for creator: ${creatorId}`)

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Query premium content for this creator (product boxes)
    const productBoxesRef = db.collection("product-boxes")
    const query = productBoxesRef.where("creatorId", "==", creatorId).orderBy("createdAt", "desc")

    const snapshot = await query.get()

    if (snapshot.empty) {
      console.log(`[API] No premium content found for creator: ${creatorId}`)
      return NextResponse.json({ content: [] })
    }

    const content = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || "Untitled Premium Content",
        description: data.description || "",
        thumbnail: data.thumbnail || data.thumbnailUrl || "",
        type: data.type || data.category || "premium",
        duration: data.duration || "",
        views: data.views || 0,
        price: data.price || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        isLocked: true,
      }
    })

    console.log(`[API] Found ${content.length} premium content items for creator: ${creatorId}`)

    return NextResponse.json({
      content,
      total: content.length,
    })
  } catch (error) {
    console.error("[API] Error fetching premium content:", error)
    return NextResponse.json({ error: "Failed to fetch premium content" }, { status: 500 })
  }
}
