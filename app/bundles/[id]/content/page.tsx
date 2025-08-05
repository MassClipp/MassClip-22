import { notFound } from "next/navigation"
import { ArrowLeft, Package } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BundleContentVideoCard } from "@/components/bundle-content-video-card"
import { db } from "@/lib/firebase-admin"

interface BundleContentPageProps {
  params: {
    id: string
  }
  searchParams: {
    session_id?: string
  }
}

async function getBundleContent(bundleId: string, sessionId?: string) {
  try {
    // Get bundle data from bundles collection
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return null
    }

    const bundleData = bundleDoc.data()!

    // Verify purchase if session_id provided
    if (sessionId) {
      const purchaseDoc = await db.collection("bundlePurchases").doc(sessionId).get()

      if (!purchaseDoc.exists) {
        return null
      }

      const purchaseData = purchaseDoc.data()!

      if (purchaseData.bundleId !== bundleId) {
        return null
      }
    }

    return {
      id: bundleId,
      title: bundleData.title || "Untitled Bundle",
      description: bundleData.description || "",
      thumbnail: bundleData.thumbnailUrl || bundleData.coverImageUrl || bundleData.customPreviewThumbnail || "",
      creatorUsername: bundleData.creatorUsername || "creator",
      contentItems: bundleData.detailedContentItems || [],
      contentMetadata: bundleData.contentMetadata || {},
    }
  } catch (error) {
    console.error("Error fetching bundle content:", error)
    return null
  }
}

export default async function BundleContentPage({ params, searchParams }: BundleContentPageProps) {
  const bundle = await getBundleContent(params.id, searchParams.session_id)

  if (!bundle) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/purchases">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Purchases
              </Button>
            </Link>
          </div>
        </div>

        {/* Bundle Info Header */}
        <div className="flex items-start gap-6 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{bundle.title}</h1>
            <p className="text-zinc-400 mb-4">
              {bundle.contentItems.length} video{bundle.contentItems.length !== 1 ? "s" : ""} • by{" "}
              {bundle.creatorUsername}
            </p>
            {bundle.description && <p className="text-zinc-300 text-sm">{bundle.description}</p>}
          </div>

          {/* Bundle Thumbnail - Top Right */}
          <div className="w-32 h-32 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
            {bundle.thumbnail ? (
              <img
                src={bundle.thumbnail || "/placeholder.svg"}
                alt={bundle.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-zinc-600" />
              </div>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bundle.contentItems.map((item: any, index: number) => (
            <BundleContentVideoCard
              key={item.id || index}
              item={{
                id: item.id || `content_${index}`,
                title: item.title || `Video ${index + 1}`,
                displayTitle: item.title || `Video ${index + 1}`,
                filename: item.filename || `${item.title || "video"}.${item.format || "mp4"}`,
                fileUrl: item.fileUrl || item.downloadUrl || "",
                downloadUrl: item.downloadUrl || item.fileUrl || "",
                thumbnailUrl: item.thumbnailUrl || "",
                fileSize: item.fileSize || 0,
                fileSizeFormatted: item.fileSizeFormatted || "0 MB",
                duration: item.duration || 0,
                durationFormatted: item.durationFormatted || "0:00",
                mimeType: item.mimeType || "video/mp4",
                quality: item.quality || "HD",
              }}
            />
          ))}
        </div>

        {/* Empty State */}
        {bundle.contentItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No Content Available</h3>
            <p className="text-zinc-400">This bundle doesn't contain any content yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
