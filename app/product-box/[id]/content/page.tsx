"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, Play, Pause, Download } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface ContentItem {
  id: string
  title?: string
  originalTitle?: string
  name?: string
  filename?: string
  displayTitle?: string
  fileUrl: string
  mimeType: string
  fileSize: number
  thumbnailUrl?: string
  contentType: "video" | "audio" | "image" | "document"
  duration?: number
  resolution?: string
  width?: number
  height?: number
}

interface Bundle {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  creatorId: string
  creatorUsername?: string
}

export default function ProductBoxContentPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useFirebaseAuth()
  const router = useRouter()
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set())
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({})

  const productBoxId = params.id

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    checkAccessAndFetchContent()
  }, [user, authLoading, productBoxId, router])

  const checkAccessAndFetchContent = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [Content Access] Checking access for product box: ${productBoxId}`)

      const token = await user.getIdToken()

      // Check if user has access to this product box
      const accessResponse = await fetch(`/api/user/product-box-access?productBoxId=${productBoxId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!accessResponse.ok) {
        throw new Error("Failed to check access")
      }

      const accessData = await accessResponse.json()
      console.log(`🔐 [Content Access] Access check result:`, accessData)

      if (!accessData.hasAccess) {
        setError("You don't have access to this content. Please purchase it first.")
        return
      }

      setHasAccess(true)

      // Fetch bundle details and content
      const bundleResponse = await fetch(`/api/bundles/${productBoxId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!bundleResponse.ok) {
        throw new Error("Failed to fetch bundle details")
      }

      const bundleData = await bundleResponse.json()
      console.log(`📦 [Content Access] Bundle data:`, bundleData)

      setBundle(bundleData.bundle)

      // Process content items with proper titles
      const processedItems = bundleData.contentItems.map((item: any) => ({
        ...item,
        displayTitle: truncateTitle(
          item.originalTitle || item.title || item.name || item.filename || `${item.contentType || "file"}`,
        ),
      }))

      setContentItems(processedItems)
      console.log(`✅ [Content Access] Loaded ${processedItems.length} content items`)
    } catch (error: any) {
      console.error("❌ [Content Access] Error:", error)
      setError(error.message || "Failed to load content")
    } finally {
      setLoading(false)
    }
  }

  const truncateTitle = (title: string, maxLength = 30) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + "..."
  }

  const handleVideoPlay = (itemId: string) => {
    const video = videoRefs.current[itemId]
    if (video) {
      if (playingVideos.has(itemId)) {
        video.pause()
        setPlayingVideos((prev) => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
      } else {
        video.play()
        setPlayingVideos((prev) => new Set(prev).add(itemId))
      }
    }
  }

  const handleVideoEnded = (itemId: string) => {
    setPlayingVideos((prev) => {
      const newSet = new Set(prev)
      newSet.delete(itemId)
      return newSet
    })
  }

  const handleDownload = async (item: ContentItem) => {
    try {
      console.log(`⬇️ [Download] Starting download for: ${item.displayTitle}`)

      const response = await fetch(item.fileUrl)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = item.filename || item.displayTitle || "download"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log(`✅ [Download] Download completed for: ${item.displayTitle}`)
    } catch (error) {
      console.error(`❌ [Download] Error downloading ${item.displayTitle}:`, error)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading content...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-4xl mx-auto">
          <Button onClick={() => router.back()} variant="ghost" className="text-white hover:text-gray-300 mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchases
          </Button>

          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Checking access...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button onClick={() => router.back()} variant="ghost" className="text-white hover:text-gray-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Purchases
            </Button>

            <Button
              onClick={checkAccessAndFetchContent}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-transparent border-gray-700 text-white hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Bundle Info */}
          {bundle && (
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">{bundle.title}</h1>
              <p className="text-gray-400">
                {contentItems.length} {contentItems.length === 1 ? "clip" : "clips"}
              </p>
              <p className="text-gray-400">
                {contentItems.filter((item) => item.contentType === "video").length} premium files unlocked
              </p>
            </div>
          )}

          {/* Content Grid */}
          {contentItems.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
                {contentItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="group relative bg-gray-900/50 rounded-lg overflow-hidden border border-transparent hover:border-gray-600 transition-all duration-300"
                    style={{
                      aspectRatio: "9/16",
                      animationDelay: `${index * 50}ms`,
                      animation: "fadeInUp 0.6s ease-out forwards",
                    }}
                  >
                    {/* Video/Content Display */}
                    <div className="relative w-full h-full">
                      {item.contentType === "video" ? (
                        <>
                          <video
                            ref={(el) => {
                              if (el) videoRefs.current[item.id] = el
                            }}
                            className="w-full h-full object-cover"
                            poster={item.thumbnailUrl}
                            preload="metadata"
                            onEnded={() => handleVideoEnded(item.id)}
                            playsInline
                          >
                            <source src={item.fileUrl} type={item.mimeType} />
                          </video>

                          {/* Play/Pause Button - Only visible on hover */}
                          <button
                            onClick={() => handleVideoPlay(item.id)}
                            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          >
                            {playingVideos.has(item.id) ? (
                              <Pause className="h-12 w-12 text-white" />
                            ) : (
                              <Play className="h-12 w-12 text-white" />
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl || "/placeholder.svg"}
                              alt={item.displayTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-gray-400 text-4xl">
                              {item.contentType === "audio" ? "🎵" : item.contentType === "image" ? "🖼️" : "📄"}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Download Button - Only visible on hover */}
                      <button
                        onClick={() => handleDownload(item)}
                        className="absolute bottom-3 right-3 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
                        title="Download"
                      >
                        <Download className="h-4 w-4 text-white" />
                      </button>
                    </div>

                    {/* Content Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <div
                        className="text-white text-sm font-medium mb-1"
                        title={item.originalTitle || item.title || item.name || item.filename}
                      >
                        {item.displayTitle}
                      </div>
                      <div className="text-gray-300 text-xs">{formatFileSize(item.fileSize)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="text-center text-gray-400">
                You've unlocked all {contentItems.filter((item) => item.contentType === "video").length} premium files
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-4">No content available</div>
              <Button onClick={checkAccessAndFetchContent}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
