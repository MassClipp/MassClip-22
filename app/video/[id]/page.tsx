"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Share2, ThumbsUp, User, Calendar, Eye, Tag, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import DashboardHeader from "@/components/dashboard-header"
import { useAuth } from "@/contexts/auth-context"
import type { UserVideo } from "@/lib/types"

export default function VideoPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [video, setVideo] = useState<UserVideo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch video data
  useEffect(() => {
    const loadVideo = async () => {
      setIsLoading(true)
      try {
        // For viewing, we'll use a special method that doesn't require auth
        // This is a placeholder - implement this method in your upload-utils.ts
        const videoData = await fetchPublicVideoById(params.id)

        if (!videoData) {
          setError("Video not found or may be private")
          return
        }

        setVideo(videoData)
      } catch (err) {
        console.error("Failed to fetch video:", err)
        setError("Error loading video")
      } finally {
        setIsLoading(false)
      }
    }

    loadVideo()
  }, [params.id])

  // Placeholder function - implement this in your actual code
  const fetchPublicVideoById = async (id: string): Promise<UserVideo | null> => {
    try {
      // This is a special case - we want to fetch a video without requiring ownership
      // In a real implementation, you'd have a server function to fetch public videos
      const videoDocRef = doc(db, "userVideos", id)
      const docSnap = await getDoc(videoDocRef)

      if (!docSnap.exists()) {
        return null
      }

      const videoData = docSnap.data() as Omit<UserVideo, "id">

      // Check if video is public or owned by current user
      if (!videoData.isPublic && (!user || videoData.userId !== user.uid)) {
        return null
      }

      return {
        id,
        ...videoData,
      }
    } catch (error) {
      console.error("Error fetching video:", error)
      throw error
    }
  }

  // Format upload date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown date"

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 premium-gradient">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
      </div>

      <DashboardHeader />

      <main className="pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-white"
                onClick={() => router.push("/dashboard/community")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Community
              </Button>
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center">
                <RefreshCw className="h-8 w-8 text-zinc-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-12 text-center">
                <h2 className="text-xl font-light mb-4">{error}</h2>
                <Button onClick={() => router.push("/dashboard/community")}>Back to Community</Button>
              </div>
            ) : video ? (
              <div className="space-y-6">
                {/* Video player */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="aspect-video">
                    <video src={video.videoUrl} controls className="w-full h-full" poster={video.thumbnailUrl} />
                  </div>
                </div>

                {/* Video info */}
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <h1 className="text-2xl font-light mb-2">{video.title}</h1>

                      {/* Category and metadata */}
                      <div className="flex flex-wrap gap-3 text-sm text-zinc-400 mb-4">
                        <div className="flex items-center">
                          <Tag className="h-4 w-4 mr-1 text-crimson" />
                          <span>{video.category}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-crimson" />
                          <span>{formatDate(video.createdAt)}</span>
                        </div>
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-1 text-crimson" />
                          <span>{video.viewCount || 0} views</span>
                        </div>
                      </div>

                      {/* Description */}
                      {video.description && <p className="text-zinc-300 font-light">{video.description}</p>}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Like
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Uploader info */}
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-zinc-800 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="font-medium">Uploaded by</h3>
                      <p className="text-zinc-400 text-sm">User ID: {video.userId}</p>
                    </div>
                  </div>
                </div>

                {/* Comments section - placeholder */}
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">Comments</h3>
                  <p className="text-zinc-400">Comments feature coming soon</p>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-12 text-center">
                <h2 className="text-xl font-light mb-4">Video not found</h2>
                <Button onClick={() => router.push("/dashboard/community")}>Back to Community</Button>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}

// Add this import at the top of the file
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
