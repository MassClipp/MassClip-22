"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Lock, Play, Plus, Video } from "lucide-react"

interface VideoType {
  id: string
  title: string
  thumbnailUrl: string
  duration: number
  isPremium: boolean
  price?: number
  views: number
}

interface CreatorVideosGridProps {
  creatorId: string
  isOwnProfile?: boolean
}

export default function CreatorVideosGrid({ creatorId, isOwnProfile = false }: CreatorVideosGridProps) {
  const [activeTab, setActiveTab] = useState<"all" | "free" | "premium">("all")
  const [videos, setVideos] = useState<VideoType[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true)
      try {
        let videosQuery

        // Determine which collection to query based on the active tab
        if (activeTab === "free") {
          videosQuery = query(
            collection(db, "freeClips"),
            where("creatorId", "==", creatorId),
            orderBy("createdAt", "desc"),
            limit(12),
          )
        } else if (activeTab === "premium") {
          videosQuery = query(
            collection(db, "premiumClips"),
            where("creatorId", "==", creatorId),
            orderBy("createdAt", "desc"),
            limit(12),
          )
        } else {
          // For "all" tab, we need to query both collections and merge results
          const freeQuery = query(
            collection(db, "freeClips"),
            where("creatorId", "==", creatorId),
            orderBy("createdAt", "desc"),
            limit(6),
          )

          const premiumQuery = query(
            collection(db, "premiumClips"),
            where("creatorId", "==", creatorId),
            orderBy("createdAt", "desc"),
            limit(6),
          )

          const [freeSnap, premiumSnap] = await Promise.all([getDocs(freeQuery), getDocs(premiumQuery)])

          const freeVideos = freeSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as VideoType[]

          const premiumVideos = premiumSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as VideoType[]

          // Combine and sort by createdAt
          const allVideos = [...freeVideos, ...premiumVideos].sort((a, b) => {
            return b.createdAt?.toMillis() - a.createdAt?.toMillis()
          })

          setVideos(allVideos.slice(0, 12))
          setLoading(false)
          return
        }

        const snapshot = await getDocs(videosQuery)
        const fetchedVideos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as VideoType[]

        setVideos(fetchedVideos)
      } catch (error) {
        console.error("Error fetching videos:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [creatorId, activeTab])

  // Format duration to MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Navigate to upload page
  const handleUploadClick = () => {
    router.push("/dashboard/upload")
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Videos</h2>
        {isOwnProfile && (
          <Button
            onClick={handleUploadClick}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload New
          </Button>
        )}
      </div>

      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "all" | "free" | "premium")}
        className="w-full"
      >
        <TabsList className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 p-1 mb-6">
          <TabsTrigger value="all" className="data-[state=active]:bg-zinc-800">
            All Videos
          </TabsTrigger>
          <TabsTrigger value="free" className="data-[state=active]:bg-zinc-800">
            <Video className="h-4 w-4 mr-2" />
            Free Content
          </TabsTrigger>
          <TabsTrigger value="premium" className="data-[state=active]:bg-zinc-800">
            <Lock className="h-4 w-4 mr-2" />
            Premium Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <VideoGrid videos={videos} loading={loading} isOwnProfile={isOwnProfile} formatDuration={formatDuration} />
        </TabsContent>

        <TabsContent value="free" className="mt-0">
          <VideoGrid videos={videos} loading={loading} isOwnProfile={isOwnProfile} formatDuration={formatDuration} />
        </TabsContent>

        <TabsContent value="premium" className="mt-0">
          <VideoGrid videos={videos} loading={loading} isOwnProfile={isOwnProfile} formatDuration={formatDuration} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function VideoGrid({
  videos,
  loading,
  isOwnProfile,
  formatDuration,
}: { videos: VideoType[]; loading: boolean; isOwnProfile: boolean; formatDuration: (seconds: number) => string }) {
  const router = useRouter()

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="bg-zinc-900/60 border-zinc-800/50 overflow-hidden">
            <div className="aspect-video relative">
              <Skeleton className="absolute inset-0" />
            </div>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800">
        <Video className="h-12 w-12 mx-auto text-zinc-700 mb-3" />
        <h3 className="text-xl font-medium mb-2">No videos found</h3>
        <p className="text-zinc-400 mb-6">
          {isOwnProfile
            ? "You haven't uploaded any videos in this category yet."
            : "This creator hasn't uploaded any videos in this category yet."}
        </p>
        {isOwnProfile && (
          <Button
            onClick={() => router.push("/dashboard/upload")}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload Your First Video
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {videos.map((video) => (
        <Card
          key={video.id}
          className="bg-zinc-900/60 backdrop-blur-sm border-zinc-800/50 overflow-hidden hover:border-zinc-700 transition-all cursor-pointer group"
          onClick={() => router.push(`/video/${video.id}`)}
        >
          <div className="aspect-video relative overflow-hidden">
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl || "/placeholder.svg"}
                alt={video.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <Video className="h-8 w-8 text-zinc-500" />
              </div>
            )}

            {/* Duration badge */}
            <div className="absolute bottom-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-xs font-medium">
              {formatDuration(video.duration || 0)}
            </div>

            {/* Premium badge */}
            {video.isPremium && (
              <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black px-2 py-0.5 rounded-full text-xs font-bold flex items-center">
                <Lock className="h-3 w-3 mr-1" />
                PREMIUM
              </div>
            )}

            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <div className="h-12 w-12 rounded-full bg-red-500/90 flex items-center justify-center">
                <Play className="h-6 w-6 text-white" fill="white" />
              </div>
            </div>
          </div>

          <CardContent className="p-3">
            <h3 className="font-medium line-clamp-2 mb-1 group-hover:text-red-500 transition-colors">{video.title}</h3>
            <div className="flex items-center text-xs text-zinc-400">
              <span>{video.views || 0} views</span>
              {video.isPremium && (
                <>
                  <span className="mx-1.5">•</span>
                  <span className="text-amber-500 font-medium">${video.price?.toFixed(2) || "5.00"}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
