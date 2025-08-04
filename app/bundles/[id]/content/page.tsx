"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, AlertCircle, Play, Package, Volume2, VolumeX } from "lucide-react"
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

// Video player component exactly like creator uploads
const VideoPlayer = ({
  content,
}: {
  content: BundleContent
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const videoUrl = content.fileUrl || content.videoUrl || content.downloadUrl || ""
  const thumbnailUrl = content.thumbnailUrl || ""

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!videoRef.current || !videoUrl) {
      toast({
        title: "Video Error",
        description: "No video URL available",
        variant: "destructive",
      })
      return
    }

    if (isPlaying) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setIsPlaying(false)
    } else {
      // Pause all other videos first
      document.querySelectorAll("video").forEach((v) => {
        if (v !== videoRef.current) {
          v.pause()
          v.currentTime = 0
        }
      })

      videoRef.current.muted = isMuted
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch((error) => {
          console.error("Error playing video:", error)
          toast({
            title: "Video Error",
            description: "Failed to play video",
            variant: "destructive",
          })
        })
    }
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

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
    console.error("Video error for:", content.title, "URL:", videoUrl)
    toast({
      title: "Video Error",
      description: `Failed to load: ${content.title}`,
      variant: "destructive",
    })
  }

  return (
    <div
      className="relative w-full aspect-[9/16] bg-black border border-white/20 overflow-hidden cursor-pointer group rounded-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isPlaying ? (
        <>
          {/* Thumbnail */}
          <div className="w-full h-full">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl || "/placeholder.svg"}
                alt={content.title}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                <Play className="w-12 h-12 text-zinc-600" />
              </div>
            )}
          </div>

          {/* Play button overlay */}
          <div
            className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-200 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
            onClick={togglePlay}
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>

          {/* Video info overlay */}
          {isHovered && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <p className="text-white text-sm font-medium truncate">{content.title}</p>
              {content.duration && (
                <p className="text-gray-300 text-xs">
                  {Math.floor(content.duration / 60)}:{(content.duration % 60).toString().padStart(2, "0")}
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            controls={false}
            playsInline
            muted={isMuted}
          >
            Your browser does not support the video tag.
          </video>

          {/* Video controls overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
            <div className="flex gap-4">
              <button
                onClick={togglePlay}
                className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <Play className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={toggleMute}
                className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
              </button>
            </div>
          </div>
        </>
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
          <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-gray-400 hover:text-white">
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
        {/* Back Button */}
        <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-gray-400 hover:text-white">
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
