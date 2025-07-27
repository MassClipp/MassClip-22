import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { creatorId: string } }) {
  try {
    const { creatorId } = params
    console.log("🔍 [Product Boxes API] Fetching product boxes for creator:", creatorId)

    if (!creatorId) {
      return NextResponse.json({ error: "Creator ID is required" }, { status: 400 })
    }

    // Get product boxes for this creator
    const productBoxesQuery = await db
      .collection("productBoxes")
      .where("creatorId", "==", creatorId)
      .orderBy("createdAt", "desc")
      .get()

    const productBoxes = productBoxesQuery.docs.map((doc) => {
      const data = doc.data()

      // Enhanced thumbnail URL retrieval with priority order
      const thumbnailUrl =
        data.customPreviewThumbnail || data.coverImage || data.coverImageUrl || data.thumbnailUrl || null

      return {
        id: doc.id,
        title: data.title || "Untitled Product Box",
        description: data.description || "",
        price: data.price || 0,
        currency: data.currency || "usd",
        coverImage: thumbnailUrl,
        customPreviewThumbnail: thumbnailUrl,
        coverImageUrl: thumbnailUrl,
        thumbnailUrl: thumbnailUrl,
        active: data.active !== false,
        contentItems: data.contentItems || [],
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        productId: data.productId || null,
        priceId: data.priceId || null,
        stripeAccountId: data.stripeAccountId || null,
      }
    })

    console.log("✅ [Product Boxes API] Retrieved product boxes:", {
      count: productBoxes.length,
      activeCount: productBoxes.filter((p) => p.active).length,
      withThumbnails: productBoxes.filter((p) => p.thumbnailUrl).length,
    })

    return NextResponse.json({
      success: true,
      productBoxes: productBoxes,
      bundles: productBoxes, // For backward compatibility
      count: productBoxes.length,
    })
  } catch (error) {
    console.error("❌ [Product Boxes API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch product boxes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
