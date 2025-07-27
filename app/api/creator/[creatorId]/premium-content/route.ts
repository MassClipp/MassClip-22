import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { creatorId: string } }) {
  try {
    const { creatorId } = params
    console.log("🔍 [Premium Content API] Fetching content for creator:", creatorId)

    // Get bundles for this creator
    const bundlesQuery = await db
      .collection("bundles")
      .where("creatorId", "==", creatorId)
      .orderBy("createdAt", "desc")
      .get()

    const bundles = bundlesQuery.docs.map((doc) => {
      const data = doc.data()

      // Enhanced thumbnail URL retrieval with priority order
      const thumbnailUrl =
        data.customPreviewThumbnail || data.coverImage || data.coverImageUrl || data.thumbnailUrl || null

      console.log("🖼️ [Premium Content API] Bundle thumbnail check:", {
        bundleId: doc.id,
        title: data.title,
        thumbnailUrl,
        availableFields: {
          customPreviewThumbnail: !!data.customPreviewThumbnail,
          coverImage: !!data.coverImage,
          coverImageUrl: !!data.coverImageUrl,
          thumbnailUrl: !!data.thumbnailUrl,
        },
      })

      return {
        id: doc.id,
        title: data.title || "Untitled Bundle",
        description: data.description || "",
        price: data.price || 0,
        currency: data.currency || "usd",
        thumbnailUrl,
        customPreviewThumbnail: thumbnailUrl, // For backward compatibility
        coverImage: thumbnailUrl, // For backward compatibility
        contentCount: data.contentItems?.length || data.contents?.length || 0,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        type: "bundle",
      }
    })

    // Get product boxes for this creator
    const productBoxesQuery = await db
      .collection("productBoxes")
      .where("creatorId", "==", creatorId)
      .orderBy("createdAt", "desc")
      .get()

    const productBoxes = productBoxesQuery.docs.map((doc) => {
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

    const allContent = [...bundles, ...productBoxes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    console.log("✅ [Premium Content API] Retrieved content:", {
      bundlesCount: bundles.length,
      productBoxesCount: productBoxes.length,
      totalContent: allContent.length,
      bundlesWithThumbnails: bundles.filter((b) => b.thumbnailUrl).length,
      productBoxesWithThumbnails: productBoxes.filter((p) => p.thumbnailUrl).length,
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
    return NextResponse.json({ error: "Failed to fetch premium content" }, { status: 500 })
  }
}
