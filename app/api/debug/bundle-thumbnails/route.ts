import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get("creatorId")

    console.log("🔍 [Bundle Thumbnails Debug] Starting diagnostic...")

    let query = db.collection("bundles")
    if (creatorId) {
      query = query.where("creatorId", "==", creatorId)
      console.log("🔍 [Bundle Thumbnails Debug] Filtering by creator:", creatorId)
    }

    const bundlesSnapshot = await query.get()
    const bundles = []
    let totalBundles = 0
    let bundlesWithThumbnails = 0
    let bundlesWithMultipleThumbnailFields = 0

    for (const doc of bundlesSnapshot.docs) {
      const data = doc.data()
      totalBundles++

      const thumbnailFields = {
        coverImage: data.coverImage || null,
        customPreviewThumbnail: data.customPreviewThumbnail || null,
        coverImageUrl: data.coverImageUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
      }

      const availableFields = Object.values(thumbnailFields).filter(Boolean)
      const hasAnyThumbnail = availableFields.length > 0

      if (hasAnyThumbnail) {
        bundlesWithThumbnails++
      }

      if (availableFields.length > 1) {
        bundlesWithMultipleThumbnailFields++
      }

      const bundleInfo = {
        id: doc.id,
        title: data.title || "Untitled",
        creatorId: data.creatorId,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        thumbnailUploadedAt: data.thumbnailUploadedAt?.toDate?.()?.toISOString() || null,
        thumbnailFields,
        hasAnyThumbnail,
        availableFieldsCount: availableFields.length,
        primaryThumbnailUrl:
          thumbnailFields.customPreviewThumbnail ||
          thumbnailFields.coverImage ||
          thumbnailFields.coverImageUrl ||
          thumbnailFields.thumbnailUrl,
      }

      bundles.push(bundleInfo)
    }

    const statistics = {
      totalBundles,
      bundlesWithThumbnails,
      bundlesWithoutThumbnails: totalBundles - bundlesWithThumbnails,
      bundlesWithMultipleThumbnailFields,
      thumbnailCoverage: totalBundles > 0 ? ((bundlesWithThumbnails / totalBundles) * 100).toFixed(1) + "%" : "0%",
    }

    console.log("📊 [Bundle Thumbnails Debug] Statistics:", statistics)

    return NextResponse.json({
      success: true,
      statistics,
      bundles: bundles.sort((a, b) => {
        // Sort by: no thumbnail first, then by creation date
        if (a.hasAnyThumbnail !== b.hasAnyThumbnail) {
          return a.hasAnyThumbnail ? 1 : -1
        }
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      }),
      recommendations: generateRecommendations(statistics, bundles),
    })
  } catch (error) {
    console.error("❌ [Bundle Thumbnails Debug] Error:", error)
    return NextResponse.json({ error: "Failed to analyze bundle thumbnails" }, { status: 500 })
  }
}

function generateRecommendations(statistics: any, bundles: any[]) {
  const recommendations = []

  if (statistics.bundlesWithoutThumbnails > 0) {
    recommendations.push({
      type: "missing_thumbnails",
      message: `${statistics.bundlesWithoutThumbnails} bundles are missing thumbnails`,
      action: "Upload thumbnails for better user experience",
      priority: "high",
    })
  }

  const bundlesWithInconsistentFields = bundles.filter((b) => b.hasAnyThumbnail && b.availableFieldsCount === 1)

  if (bundlesWithInconsistentFields.length > 0) {
    recommendations.push({
      type: "inconsistent_fields",
      message: `${bundlesWithInconsistentFields.length} bundles have thumbnails in only one field`,
      action: "Consider updating thumbnail upload process to populate all fields",
      priority: "medium",
    })
  }

  if (statistics.thumbnailCoverage === "100%") {
    recommendations.push({
      type: "excellent",
      message: "All bundles have thumbnails!",
      action: "Great job maintaining visual consistency",
      priority: "info",
    })
  }

  return recommendations
}
