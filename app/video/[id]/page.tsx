"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DirectVideoPlayer from "@/components/direct-video-player"
import VideoDebug from "@/components/video-debug"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Share2 } from "lucide-react"

export default function VideoPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const creatorId = searchParams.get("creatorId")
  const isPremium = searchParams.get("isPremium") === "true"
  const { user } = useAuth()

  const [video, setVideo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    const fetchVideo = async () => {
      if (!creatorId || !id) {
        setError("Missing video information")
        setLoading(false)
        return
      }

      try {
        // Determine the collection based on isPremium
        const collectionPath = isPremium ? `users/${creatorId}/premiumClips` : `users/${creatorId}/freeClips`

        const videoRef = doc(db, collectionPath, id as string)
        const videoDoc = await getDoc(videoRef)

        if (!videoDoc.exists()) {
          setError("Video not found")
          setLoading(false)
          return
        }

        const videoData = videoDoc.data()
        console.log("Fetched video data:", videoData)

        setVideo(videoData)
      } catch (err) {
        console.error("Error fetching video:", err)
        setError("Failed to load video")
      } finally {
        setLoading(false)
      }
    }

    fetchVideo()
  }, [id, creatorId, isPremium])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || "Video on MassClip",
          text: video?.description || "Check out this video on MassClip",
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  const handleGoBack = () => {
    window.history.back()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white">Loading video...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-white mb-4">Error: {error}</h2>
          <Button onClick={handleGoBack} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-white mb-4">Video not found</h2>
          <Button onClick={handleGoBack} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Button variant="ghost" size="sm" onClick={handleShare} className="text-white">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Video Player - Using our guaranteed-to-work player */}
        <div className="mx-auto" style={{ maxWidth: "calc(100vh * 9/16)" }}>
          <DirectVideoPlayer
            videoUrl={video.url}
            thumbnailUrl={video.thumbnailUrl}
            title={video.title || video.name || "Untitled"}
          />
        </div>

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-white mb-2">{video.title || video.name || "Untitled"}</h1>
          {video.description && <p className="text-zinc-300 mt-2">{video.description}</p>}
        </div>

        {/* Debug section - only visible to the video owner or when explicitly shown */}
        {(user?.uid === creatorId || showDebug) && (
          <div className="mt-8">
            <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)} className="mb-4">
              {showDebug ? "Hide Debug Info" : "Show Debug Info"}
            </Button>

            {showDebug && (
              <>
                <VideoDebug videoUrl={video.url} thumbnailUrl={video.thumbnailUrl} />

                <div className="mt-4 p-4 bg-zinc-900 rounded-lg">
                  <h3 className="text-lg font-medium text-white mb-2">Video Data</h3>
                  <pre className="text-xs text-zinc-400 overflow-auto p-2 bg-zinc-800 rounded">
                    {JSON.stringify(video, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
