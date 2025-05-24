"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, ArrowLeft, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import PremiumVideoPlayer from "@/components/premium-video-player"

export default function VideoPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [video, setVideo] = useState<any>(null)
  const [creator, setCreator] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return

      try {
        setLoading(true)
        const videoRef = doc(db, "videos", id as string)
        const videoDoc = await getDoc(videoRef)

        if (!videoDoc.exists()) {
          setError("Video not found")
          return
        }

        const videoData = videoDoc.data()
        setVideo({
          id: videoDoc.id,
          ...videoData,
        })

        // Fetch creator info
        if (videoData.uid) {
          const creatorRef = doc(db, "users", videoData.uid)
          const creatorDoc = await getDoc(creatorRef)
          if (creatorDoc.exists()) {
            setCreator({
              id: creatorDoc.id,
              ...creatorDoc.data(),
            })
          }
        }
      } catch (err) {
        console.error("Error fetching video:", err)
        setError("Failed to load video")
      } finally {
        setLoading(false)
      }
    }

    fetchVideo()
  }, [id])

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=/video/${id}`)
    }
  }, [user, loading, id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-500/10 p-3 rounded-full inline-flex mb-4">
            <Lock className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Video Not Found</h1>
          <p className="text-zinc-400 mb-6">{error || "This video doesn't exist or has been removed."}</p>
          <Button onClick={() => router.push("/")} variant="outline">
            Return Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container max-w-4xl py-8">
        {/* Back button */}
        <Button variant="ghost" className="mb-6 text-zinc-400 hover:text-white" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Video player */}
        <PremiumVideoPlayer video={video} />

        {/* Video info */}
        <div className="mt-6">
          <h1 className="text-2xl font-bold text-white mb-2">{video.title}</h1>
          {creator && (
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden mr-2">
                {creator.profilePic ? (
                  <img
                    src={creator.profilePic || "/placeholder.svg"}
                    alt={creator.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400">
                    {creator.displayName?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <a href={`/creator/${creator.username}`} className="text-zinc-400 hover:text-white transition-colors">
                {creator.displayName || creator.username}
              </a>
            </div>
          )}
          {video.description && <p className="text-zinc-300 whitespace-pre-line">{video.description}</p>}
        </div>
      </div>
    </div>
  )
}
