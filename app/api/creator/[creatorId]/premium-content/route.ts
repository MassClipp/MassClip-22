import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { creatorId: string } }) {
  try {
    const { creatorId } = params
    console.log("🔍 [Premium Content API] Fetching content for creator:", creatorId)

    if (!creatorId) {
      return NextResponse.json({ error: "Creator ID is required" }, { status: 400 })
    }

    // Get bundles for this creator
    let bundles: any[] = []
    try {
      const bundlesQuery = await db
        .collection("bundles")
        .where("creatorId", "==", creatorId)
        .where("active", "==", true)
        .orderBy("createdAt", "desc")
        .get()

      bundles = bundlesQuery.docs.map((doc) => {
        const data = doc.data()
        const thumbnailUrl =
          data.customPreviewThumbnail || data.coverImage || data.coverImageUrl || data.thumbnailUrl || null

        return {
          id: doc.id,
          title: data.title || "Untitled Bundle",
          description: data.description || "",
          price: data.price || 0,
          currency: data.currency || "usd",
          thumbnailUrl,
          customPreviewThumbnail: thumbnailUrl,
          coverImage: thumbnailUrl,
          contentCount: data.contentItems?.length || data.contents?.length || 0,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          type: "bundle",
        }
      })
    } catch (bundleError) {
      console.warn("⚠️ [Premium Content API] Error fetching bundles:", bundleError)
      // Continue with empty bundles array
    }

    // Get product boxes for this creator
    let productBoxes: any[] = []
    try {
      const productBoxesQuery = await db
        .collection("productBoxes")
        .where("creatorId", "==", creatorId)
        .where("active", "==", true)
        .orderBy("createdAt", "desc")
        .get()

      productBoxes = productBoxesQuery.docs.map((doc) => {
        const data = doc.data()
        const thumbnailUrl = data.customPreviewThumbnail || data.coverImage || data.thumbnailUrl || null

        return {
          id: doc.id,
          title: data.title || "Untitled Product",
          description: data.description || "",
          price: data.price || 0,
          currency: data.currency || "usd",
          thumbnailUrl,
          customPreviewThumbnail: thumbnailUrl,
          coverImage: thumbnailUrl,
          contentCount: data.contentItems?.length || 0,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          type: "product_box",
        }
      })
    } catch (productBoxError) {
      console.warn("⚠️ [Premium Content API] Error fetching product boxes:", productBoxError)
      // Continue with empty product boxes array
    }

    const allContent = [...bundles, ...productBoxes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    console.log("✅ [Premium Content API] Retrieved content:", {
      bundlesCount: bundles.length,
      productBoxesCount: productBoxes.length,
      totalContent: allContent.length,
    })

    return NextResponse.json({
      success: true,
      content: allContent,
      stats: {
        totalBundles: bundles.length,
        totalProductBoxes: productBoxes.length,
        totalContent: allContent.length,
        bundlesWithThumbnails: bundles.filter((b) => b.thumbnailUrl).length,
        productBoxesWithThumbnails: productBoxes.filter((p) => p.thumbnailUrl).length,
      },
    })
  } catch (error) {
    console.error("❌ [Premium Content API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch premium content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
