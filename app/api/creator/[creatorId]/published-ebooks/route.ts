import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { creatorId: string } }) {
  try {
    const { creatorId } = params

    if (!creatorId) {
      return NextResponse.json({ error: "Creator ID is required" }, { status: 400 })
    }

    console.log(`📚 Fetching published eBooks for creator: ${creatorId}`)

    initializeFirebaseAdmin()

    const ebooksRef = db.collection("ebooks")
    const snapshot = await ebooksRef.where("creatorId", "==", creatorId).where("status", "==", "published").get()

    console.log(`📊 Found ${snapshot.size} published eBooks`)

    const ebooks = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || "Untitled eBook",
        description: data.description || "",
        thumbnailUrl: data.coverUrl || "",
        coverUrl: data.coverUrl || "",
        pageCount: data.pageCount || 0,
        price: data.price || 0,
        stripePriceId: data.stripePriceId || "",
        stripeProductId: data.stripeProductId || "",
        type: "ebook",
        isPremium: true,
        createdAt: data.createdAt,
      }
    })

    // Sort by creation date (newest first)
    ebooks.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      const aTime = a.createdAt.seconds || a.createdAt.getTime?.() / 1000 || 0
      const bTime = b.createdAt.seconds || b.createdAt.getTime?.() / 1000 || 0
      return bTime - aTime
    })

    console.log(`✅ Returning ${ebooks.length} published eBooks`)

    return NextResponse.json({
      success: true,
      content: ebooks,
      count: ebooks.length,
    })
  } catch (error) {
    console.error("❌ Error fetching published eBooks:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch published eBooks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
