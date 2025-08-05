"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { FullscreenWrapper } from "@/components/fullscreen-wrapper"
import { ArrowLeft, Download, RefreshCw, Play, Pause } from "lucide-react"

interface ContentItem {
  id: string
  title: string
  fileUrl: string
  mimeType: string
  fileSize: number
  thumbnailUrl?: string
  contentType: "video" | "audio" | "image" | "document"
  duration?: number
  filename: string
  displayTitle: string
  displaySize: string
  originalTitle?: string
  name?: string
}

interface BundleData {
  title: string
  description?: string
  thumbnail?: string
  creatorUsername: string
  totalItems: number
}

export default function ProductBoxContentPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bundleData, setBundleData] = useState<BundleData | null>(null)
  const [items, setItems] = useState<ContentItem[]>([])
  const [currentlyPlayingVideo, setCurrentlyPlayingVideo] = useState<string | null>(null)
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set())

  const productBoxId = params.id as string

  useEffect(() => {
    if (!user || !productBoxId) {
      setLoading(false)
      setError("Missing user or product box ID")
      return
    }

    checkAccessAndFetchContent()
  }, [user, productBoxId])

  const checkAccessAndFetchContent = async () => {
    if (!user || !productBoxId) return

    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [Content Page] Checking access for bundle: ${productBoxId}`)

      const idToken = await user.getIdToken()

      // Check if user has access via purchases
      const purchasesResponse = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (purchasesResponse.ok) {
        const purchasesData = await purchasesResponse.json()
        const purchases = Array.isArray(purchasesData) ? purchasesData : purchasesData.purchases || []

        const matchingPurchase = purchases.find(
          (purchase: any) =>
            purchase.productBoxId?.toLowerCase() === productBoxId.toLowerCase() ||
            purchase.bundleId?.toLowerCase() === productBoxId.toLowerCase(),
        )

        if (matchingPurchase) {
          console.log(`✅ [Content Page] Access granted via purchase`, matchingPurchase)

          // Use the bundle data from the purchase with enhanced title logging
          const bundleInfo: BundleData = {
            title: matchingPurchase.productBoxTitle || matchingPurchase.bundleTitle || "Untitled Bundle",
            description: matchingPurchase.productBoxDescription || "",
            thumbnail: matchingPurchase.productBoxThumbnail || matchingPurchase.thumbnailUrl,
            creatorUsername: matchingPurchase.creatorUsername || matchingPurchase.creatorName || "Unknown",
            totalItems: matchingPurchase.totalItems || matchingPurchase.items?.length || 0,
          }

          // Log the bundle title for debugging
          console.log(`📝 [Content Page] Bundle title: "${bundleInfo.title}"`)

          // Use the content items directly from the purchase
          let contentItems: ContentItem[] = []

          if (matchingPurchase.items && Array.isArray(matchingPurchase.items)) {
            console.log(`📦 [Content Page] Found ${matchingPurchase.items.length} items in purchase`)

            contentItems = matchingPurchase.items.map((item: any, index: number) => {
              // Enhanced title extraction with better fallbacks
              let displayTitle =
                item.displayTitle ||
                item.title ||
                item.name ||
                item.filename ||
                item.originalFileName ||
                item.originalTitle ||
                `Content Item ${index + 1}`

              // Clean up the title - remove file extensions and normalize
              displayTitle = displayTitle.replace(/\.(mp4|mov|avi|mkv|webm|m4v|mp3|wav|jpg|jpeg|png|gif|pdf)$/i, "")

              // Log each item's title for debugging
              console.log(
                `📝 [Content Page] Item ${index + 1} title: "${displayTitle}" (from: ${JSON.stringify({
                  displayTitle: item.displayTitle,
                  title: item.title,
                  name: item.name,
                  filename: item.filename,
                  originalFileName: item.originalFileName,
                  originalTitle: item.originalTitle,
                })})`,
              )

              // Determine content type from mimeType or fileUrl
              let contentType: "video" | "audio" | "image" | "document" = "document"
              if (item.mimeType) {
                if (item.mimeType.startsWith("video/")) contentType = "video"
                else if (item.mimeType.startsWith("audio/")) contentType = "audio"
                else if (item.mimeType.startsWith("image/")) contentType = "image"
              } else if (item.fileUrl) {
                // Fallback: check file extension
                const url = item.fileUrl.toLowerCase()
                if (
                  url.includes(".mp4") ||
                  url.includes(".mov") ||
                  url.includes(".avi") ||
                  url.includes(".mkv") ||
                  url.includes(".webm")
                ) {
                  contentType = "video"
                } else if (url.includes(".mp3") || url.includes(".wav")) {
                  contentType = "audio"
                } else if (
                  url.includes(".jpg") ||
                  url.includes(".jpeg") ||
                  url.includes(".png") ||
                  url.includes(".gif")
                ) {
                  contentType = "image"
                }
              }

              return {
                id: item.id || `item-${index}`,
                title: displayTitle,
                fileUrl: item.fileUrl || "",
                mimeType: item.mimeType || "application/octet-stream",
                fileSize: item.fileSize || 0,
                thumbnailUrl: item.thumbnailUrl || "",
                contentType,
                duration: item.duration,
                filename: item.filename || displayTitle,
                displayTitle,
                displaySize: item.displaySize || formatFileSize(item.fileSize || 0),
                originalTitle: item.originalTitle,
                name: item.name,
              }
            })
          } else {
            console.log(`⚠️ [Content Page] No items found in purchase, trying API fallback`)

            // Fallback: try to fetch content from API
            const contentResponse = await fetch(`/api/product-box/${productBoxId}/content`, {
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            })

            if (contentResponse.ok) {
              const contentData = await contentResponse.json()
              const apiItems = Array.isArray(contentData) ? contentData : contentData.items || []

              contentItems = apiItems.map((item: any, index: number) => {
                let displayTitle = item.title || item.filename || item.name || `Content Item ${index + 1}`
                displayTitle = displayTitle.replace(/\.(mp4|mov|avi|mkv|webm|m4v|mp3|wav|jpg|jpeg|png|gif|pdf)$/i, "")

                let contentType: "video" | "audio" | "image" | "document" = "document"
                if (item.mimeType?.startsWith("video/")) contentType = "video"
                else if (item.mimeType?.startsWith("audio/")) contentType = "audio"
                else if (item.mimeType?.startsWith("image/")) contentType = "image"

                return {
                  id: item.id || `item-${index}`,
                  title: displayTitle,
                  fileUrl: item.fileUrl || item.downloadUrl || "",
                  mimeType: item.mimeType || "application/octet-stream",
                  fileSize: item.fileSize || 0,
                  thumbnailUrl: item.thumbnailUrl || "",
                  contentType,
                  duration: item.duration,
                  filename: item.filename || displayTitle,
                  displayTitle,
                  displaySize: formatFileSize(item.fileSize || 0),
                  originalTitle: item.originalTitle,
                  name: item.name,
                }
              })
            }
          }

          console.log(
            `📝 [Content Page] Final content items:`,
            contentItems.map((item) => ({
              title: item.displayTitle,
              fileUrl: item.fileUrl,
              contentType: item.contentType,
              thumbnailUrl: item.thumbnailUrl,
            })),
          )

          setBundleData(bundleInfo)
          setItems(contentItems)
          setHasAccess(true)
        } else {
          console.log(`❌ [Content Page] No matching purchase found`)
          setError("You don't have access to this content")
          setHasAccess(false)
        }
      } else {
        console.error(`❌ [Content Page] Failed to check purchases`)
        setError("Failed to verify access")
        setHasAccess(false)
      }
    } catch (error: any) {
      console.error(`❌ [Content Page] Error:`, error)
      setError(error.message || "Failed to load content")
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (item: ContentItem) => {
    try {
      console.log(`📥 [Download] Starting direct download for: ${item.displayTitle}`)

      setDownloadingItems((prev) => new Set(prev).add(item.id))

      // Fetch the file as a blob
      const response = await fetch(item.fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`)
      }

      const blob = await response.blob()

      // Create a blob URL
      const blobUrl = URL.createObjectURL(blob)

      // Create download link
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = item.filename || item.displayTitle

      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl)

      console.log(`✅ [Download] Direct download completed for: ${item.displayTitle}`)
    } catch (error) {
      console.error(`❌ [Download] Error downloading ${item.displayTitle}:`, error)

      // Fallback to original method
      try {
        const link = document.createElement("a")
        link.href = item.fileUrl
        link.download = item.filename || item.displayTitle
        link.target = "_blank"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        console.log(`✅ [Download] Fallback download initiated for: ${item.displayTitle}`)
      } catch (fallbackError) {
        console.error(`❌ [Download] Fallback download failed:`, fallbackError)
      }
    } finally {
      setDownloadingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
    }
  }

  const handleVideoToggle = (itemId: string, videoElement: HTMLVideoElement) => {
    // If there's a currently playing video and it's not this one, pause it
    if (currentlyPlayingVideo && currentlyPlayingVideo !== itemId) {
      const currentVideo = document.querySelector(`video[data-video-id="${currentlyPlayingVideo}"]`) as HTMLVideoElement
      if (currentVideo) {
        currentVideo.pause()
      }
    }

    const isCurrentlyPlaying = currentlyPlayingVideo === itemId

    if (isCurrentlyPlaying) {
      videoElement.pause()
      setCurrentlyPlayingVideo(null)
    } else {
      videoElement.play()
      setCurrentlyPlayingVideo(itemId)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const truncateTitle = (title: string, maxLength = 25): string => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + "..."
  }

  // Enhanced Video Card Component with better video handling
  const VideoCard = ({ item }: { item: ContentItem }) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [videoLoaded, setVideoLoaded] = useState(false)
    const [videoError, setVideoError] = useState(false)

    const handleVideoLoad = () => {
      setVideoLoaded(true)
      setVideoError(false)
      console.log(`✅ [Video Card] Video loaded successfully for: ${item.displayTitle}`)
    }

    const handleVideoError = (e: any) => {
      console.error(`❌ [Video Card] Error loading video for ${item.displayTitle}:`, e)
      setVideoError(true)
      setVideoLoaded(false)
    }

    // Check if we have a valid video URL
    const hasValidVideoUrl = item.fileUrl && item.fileUrl.startsWith("http") && item.contentType === "video"

    console.log(`🎥 [Video Card] Rendering card for "${item.displayTitle}":`, {
      hasValidVideoUrl,
      fileUrl: item.fileUrl,
      contentType: item.contentType,
      thumbnailUrl: item.thumbnailUrl,
      videoError,
      videoLoaded,
    })

    return (
      <div className="relative group cursor-pointer">
        {/* Video Container - 9:16 Aspect Ratio */}
        <div
          className="relative bg-gray-900 rounded-lg overflow-hidden border border-transparent group-hover:border-gray-600 transition-all duration-300"
          style={{ aspectRatio: "9/16" }}
        >
          {hasValidVideoUrl && !videoError ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                src={item.fileUrl}
                loop
                muted
                playsInline
                preload="metadata"
                data-video-id={item.id}
                onLoadedData={handleVideoLoad}
                onLoadedMetadata={handleVideoLoad}
                onCanPlay={handleVideoLoad}
                onError={handleVideoError}
                onEnded={() => {
                  setCurrentlyPlayingVideo(null)
                }}
                poster={item.thumbnailUrl}
                crossOrigin="anonymous"
                controls={false}
              />

              {/* Loading state */}
              {!videoLoaded && !videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}

              {/* Play/Pause Button - Center - Only visible on hover */}
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                onClick={(e) => {
                  e.stopPropagation()
                  if (videoRef.current) {
                    handleVideoToggle(item.id, videoRef.current)
                  }
                }}
              >
                <div className="bg-black/50 rounded-full p-3 hover:bg-black/70 transition-colors duration-300">
                  {currentlyPlayingVideo === item.id ? (
                    <Pause className="h-6 w-6 text-white" />
                  ) : (
                    <Play className="h-6 w-6 text-white ml-1" />
                  )}
                </div>
              </div>

              {/* Download Button - Bottom Right - Always visible on hover */}
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(item)
                  }}
                  size="sm"
                  disabled={downloadingItems.has(item.id)}
                  className="h-8 w-8 p-0 bg-black/80 hover:bg-black/90 text-white border-0 rounded-full shadow-lg"
                >
                  {downloadingItems.has(item.id) ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <div className="text-gray-500 text-4xl mb-3">
                {item.contentType === "audio" ? "🎵" : item.contentType === "image" ? "🖼️" : "📄"}
              </div>
              <Button
                onClick={() => handleDownload(item)}
                size="sm"
                disabled={downloadingItems.has(item.id)}
                className="bg-white text-black hover:bg-gray-100 text-xs px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                {downloadingItems.has(item.id) ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-black mr-1"></div>
                ) : (
                  <Download className="h-3 w-3 mr-1" />
                )}
                {downloadingItems.has(item.id) ? "Downloading..." : "Download"}
              </Button>
            </div>
          )}
        </div>

        {/* Title and File Size - Below Video */}
        <div className="mt-2 px-1">
          <div className="text-white text-sm font-medium mb-1" title={item.displayTitle}>
            {truncateTitle(item.displayTitle)}
          </div>
          <div className="text-gray-400 text-xs">{item.displaySize}</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <FullscreenWrapper className="bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading content...</div>
        </div>
      </FullscreenWrapper>
    )
  }

  if (!hasAccess || error) {
    return (
      <FullscreenWrapper className="bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-red-500 text-6xl mb-4">🔒</div>
          <h2 className="text-white text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-400 mb-6">{error || "You don't have access to this content"}</p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/dashboard/purchases")}
              className="w-full bg-white text-black hover:bg-gray-100"
            >
              Back to Purchases
            </Button>
            <Button
              onClick={checkAccessAndFetchContent}
              variant="outline"
              className="w-full border-gray-600 text-white hover:bg-gray-800 bg-transparent"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </FullscreenWrapper>
    )
  }

  return (
    <FullscreenWrapper className="bg-black">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-4 mb-4">
          <Button
            onClick={() => router.push("/dashboard/purchases")}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchases
          </Button>
          <Button
            onClick={checkAccessAndFetchContent}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-gray-800 ml-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex items-start gap-6 max-w-4xl">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{bundleData?.title}</h1>
            <p className="text-gray-400 text-lg">
              {items.length} premium file{items.length !== 1 ? "s" : ""} unlocked
            </p>
          </div>

          {/* Bundle Thumbnail */}
          {bundleData?.thumbnail && (
            <div className="flex-shrink-0">
              <img
                src={bundleData.thumbnail || "/placeholder.svg"}
                alt={bundleData.title}
                className="w-24 h-24 rounded-lg object-cover border border-gray-700"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="p-6">
        {items.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
              {items.map((item) => (
                <VideoCard key={item.id} item={item} />
              ))}
            </div>

            {/* Summary */}
            <div className="text-center py-8">
              <div className="text-gray-400 text-lg">
                You've unlocked all {items.length} premium file{items.length !== 1 ? "s" : ""}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 text-6xl mb-4">📦</div>
            <h3 className="text-white text-xl font-semibold mb-2">No Content Available</h3>
            <p className="text-gray-400 mb-6">This bundle doesn't contain any content items yet.</p>
            <Button
              onClick={() => router.push("/dashboard/purchases")}
              className="bg-white text-black hover:bg-gray-100"
            >
              Back to Purchases
            </Button>
          </div>
        )}
      </div>
    </FullscreenWrapper>
  )
}
