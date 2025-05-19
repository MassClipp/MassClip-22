"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import EnhancedVideoPlayer from "@/components/enhanced-video-player"
import VideoDebug from "@/components/video-debug"

export default function VideoPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()

  const creatorId = searchParams.get("creatorId")
  const isPremium = searchParams.get("isPremium") === "true"
  const debug = searchParams.get("debug") === "true"

  const [video, setVideo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creator, setCreator] = useState<any>(null)

  useEffect(() => {
    const fetchVideoData = async () => {
      if (!creatorId || !id) {
        setError("Missing video information")
        setLoading(false)
        return
      }

      try {
        const collectionName = isPremium ? "premiumClips" : "freeClips"
        const videoRef = doc(db, `users/${creatorId}/${collectionName}/${id}`)
        const videoDoc = await getDoc(videoRef)

        if (!videoDoc.exists()) {
          setError("Video not found")
          setLoading(false)
          return
        }

        const videoData = videoDoc.data()
        setVideo(videoData)

        // Fetch creator info
        const creatorRef = doc(db, "users", creatorId)
        const creatorDoc = await getDoc(creatorRef)

        if (creatorDoc.exists()) {
          setCreator(creatorDoc.data())
        }
      } catch (err) {
        console.error("Error fetching video:", err)
        setError("Failed to load video")
      } finally {
        setLoading(false)
      }
    }

    fetchVideoData()
  }, [id, creatorId, isPremium])

  const handleBack = () => {
    router.back()
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || "Video on MassClip",
          text: `Check out this video on MassClip`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link copied",
        description: "Video link copied to clipboard!",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-zinc-700 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
        <p className="text-zinc-400 mb-6">{error || "Failed to load video"}</p>
        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    )
  }

  const isOwner = user && user.uid === creatorId

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-6">
        {/* Back button */}
        <div className="mb-4">
          <Button variant="ghost" onClick={handleBack} className="text-zinc-400 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Video player */}
        <div className="max-w-4xl mx-auto">
          <EnhancedVideoPlayer
            videoUrl={video.url}
            thumbnailUrl={video.thumbnailUrl}
            title={video.title}
            isPremium={isPremium}
            videoId={id as string}
            creatorId={creatorId as string}
          />

          {/* Video info */}
          <div className="mt-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-white">{video.title}</h1>
                {creator && (
                  <a
                    href={`/creator/${creator.username}`}
                    className="text-zinc-400 hover:text-white text-sm mt-1 inline-block"
                  >
                    {creator.displayName}
                  </a>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleShare} className="text-zinc-400 hover:text-white">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>

            {video.description && (
              <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg">
                <p className="text-zinc-300 whitespace-pre-wrap">{video.description}</p>
              </div>
            )}

            {/* Debug tools for owners or when debug param is present */}
            {(isOwner || debug) && <VideoDebug videoUrl={video.url} />}
          </div>
        </div>
      </div>
    </div>
  )
}
