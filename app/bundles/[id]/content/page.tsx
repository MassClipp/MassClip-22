"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, AlertCircle, Play, Package, Volume2, VolumeX, Pause } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"

interface BundleContent {
  id: string
  title: string
  description?: string
  type: string
  fileType: string
  size: number
  duration?: number
  thumbnailUrl?: string
  downloadUrl?: string
  fileUrl?: string
  videoUrl?: string
  createdAt: string
  metadata?: any
}

interface BundleInfo {
  id: string
  title: string
  description?: string
  creatorId: string
  creatorUsername: string
  thumbnailUrl?: string
  price: number
  currency: string
}

interface PurchaseInfo {
  purchaseId: string
  purchaseDate: string
  status: string
}

// Video player component with hover effects and smaller play button
const VideoPlayer = ({ content }: { content: BundleContent }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Get the best available video URL
  const videoUrl = content.fileUrl || content.videoUrl || content.downloadUrl || ""
  const thumbnailUrl = content.thumbnailUrl || ""

  const handlePlay = () => {
    if (!videoRef.current || !videoUrl) {
      console.error(`❌ [VideoPlayer] No video ref or URL for: ${content.title}`)
      toast({
        title: "Video Error",
        description: "Unable to play video",
        variant: "destructive",
      })
      return
    }

    // Pause all other videos first
    document.querySelectorAll("video").forEach((video) => {
      if (video !== videoRef.current) {
        video.pause()
        video.currentTime = 0
      }
    })

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.muted = isMuted
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch((error) => {
          console.error(`❌ [VideoPlayer] Play error for ${content.title}:`, error)
          toast({
            title: "Video Error",
            description: `Failed to play: ${content.title}`,
            variant: "destructive",
          })
        })
    }
  }

  const handleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted
      setIsMuted(newMutedState)
      videoRef.current.muted = newMutedState
    }
  }

  const handleVideoEnd = () => {
    setIsPlaying(false)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
  }

  const handleVideoError = () => {
    setIsPlaying(false)
    console.error(`❌ [VideoPlayer] Video error for: ${content.title}`)
    toast({
      title: "Video Error",
      description: `Failed to load: ${content.title}`,
      variant: "destructive",
    })
  }

  if (!videoUrl) {
    return (
      <div className="relative w-full aspect-[9/16] bg-black border border-white/20 overflow-hidden rounded-lg">
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-400 text-xs">No video URL</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`relative w-full aspect-[9/16] bg-black overflow-hidden cursor-pointer group rounded-lg transition-all duration-300 ${
        isHovered ? "border border-white/60" : "border border-white/20"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video element - always present, shows upfront */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        onEnded={handleVideoEnd}
        onError={handleVideoError}
        controls={false}
        playsInline
        muted={isMuted}
        preload="metadata"
        poster={thumbnailUrl || undefined}
      >
        Your browser does not support the video tag.
      </video>

      {/* Play/Pause overlay - only shows on hover */}
      {isHovered && (
        <div
          className="absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-200"
          onClick={handlePlay}
        >
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
            {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
          </div>
        </div>
      )}

      {/* Mute button - shows when playing and hovered */}
      {isPlaying && isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleMute()
          }}
          className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
        </button>
      )}
    </div>
  )
}

export default function BundleContentPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()
  const [bundle, setBundle] = useState<BundleInfo | null>(null)
  const [contents, setContents] = useState<BundleContent[]>([])
  const [purchaseInfo, setPurchaseInfo] = useState<PurchaseInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const bundleId = params.id as string

  useEffect(() => {
    if (user && bundleId) {
      fetchBundleContent()
    }
  }, [user, bundleId])

  const fetchBundleContent = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [Bundle Content Page] Fetching content for bundle:", bundleId)

      const token = await user.getIdToken()
      const response = await fetch(`/api/bundles/${bundleId}/content`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("📡 [Bundle Content Page] API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ [Bundle Content Page] API error:", errorData)

        if (response.status === 403) {
          throw new Error("You don't have access to this bundle")
        }
        throw new Error(errorData.error || `Failed to fetch bundle content: ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ [Bundle Content Page] API response data:", data)

      setBundle(data.bundle)
      setContents(data.contents || [])
      setPurchaseInfo(data.purchaseInfo)

      console.log(`📦 [Bundle Content Page] Set ${data.contents?.length || 0} content items`)

      // Log each content item's video URL status
      data.contents?.forEach((content: BundleContent, index: number) => {
        console.log(`📹 [Bundle Content Page] Content ${index + 1}: ${content.title}`, {
          hasFileUrl: !!content.fileUrl,
          hasVideoUrl: !!content.videoUrl,
          hasDownloadUrl: !!content.downloadUrl,
          finalUrl: content.fileUrl || content.videoUrl || content.downloadUrl || "MISSING",
        })
      })
    } catch (err) {
      console.error("❌ [Bundle Content Page] Error:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch bundle content")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div
        className="min-h-screen text-white p-6"
        style={{
          background: `linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 30%, #262626 50%, #1a1a1a 70%, #0d0d0d 100%)`,
        }}
      >
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6 bg-gray-800" />

          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8 pb-6">
            <div className="flex-1">
              <Skeleton className="h-8 w-64 mb-2 bg-gray-800" />
              <Skeleton className="h-4 w-32 mb-4 bg-gray-800" />
            </div>
            <Skeleton className="w-20 h-20 bg-gray-800 rounded-lg flex-shrink-0" />
          </div>

          {/* Border line */}
          <div className="border-t border-white/10 mb-8"></div>

          {/* Video grid skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="w-full aspect-[9/16] bg-gray-800 rounded-lg" />
                <Skeleton className="h-4 w-full bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="min-h-screen text-white p-6"
        style={{
          background: `linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 30%, #262626 50%, #1a1a1a 70%, #0d0d0d 100%)`,
        }}
      >
        <div className="max-w-7xl mx-auto">
          <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-gray-400">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchases
          </Button>
          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchBundleContent} className="mt-4 bg-white text-black hover:bg-gray-200">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen text-white p-6"
      style={{
        background: `linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 30%, #262626 50%, #1a1a1a 70%, #0d0d0d 100%)`,
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Back Button - No hover effect */}
        <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-gray-400">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Purchases
        </Button>

        {/* Bundle Header - Simplified with thumbnail in top right */}
        <div className="flex items-center justify-between mb-8 pb-6">
          {/* Bundle Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2 tracking-tight">{bundle?.title}</h1>
            <div className="flex items-center gap-4 text-gray-400 text-sm">
              <span>{contents.length} videos</span>
              <span>•</span>
              <span>by {bundle?.creatorUsername}</span>
            </div>
          </div>

          {/* Thumbnail - Top right */}
          <div className="w-20 h-20 bg-black border border-white/20 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            {bundle?.thumbnailUrl ? (
              <img
                src={bundle.thumbnailUrl || "/placeholder.svg"}
                alt={bundle.title}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center bg-black rounded-lg">
                        <svg class="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                      </div>
                    `
                  }
                }}
              />
            ) : (
              <Package className="h-8 w-8 text-gray-500" />
            )}
          </div>
        </div>

        {/* Thin white border line */}
        <div className="border-t border-white/10 mb-8"></div>

        {/* Content Grid - 9:16 videos like creator uploads */}
        {contents.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-black border border-white/20 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No content available</h3>
            <p className="text-gray-400">This bundle doesn't have any content items yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {contents.map((content) => (
              <div key={content.id} className="space-y-2">
                <VideoPlayer content={content} />
                <div className="px-1">
                  <h3 className="text-sm font-medium text-white truncate tracking-tight">{content.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
