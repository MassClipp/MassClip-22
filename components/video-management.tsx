"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, getDocs } from "firebase/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Eye, Lock } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface VideoItem {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  publicUrl: string
  createdAt: any
  views: number
  contentType: string
}

export default function VideoManagement() {
  const [freeVideos, setFreeVideos] = useState<VideoItem[]>([])
  const [premiumVideos, setPremiumVideos] = useState<VideoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchVideos = async () => {
      if (!user?.uid) return

      setIsLoading(true)
      try {
        // Fetch free videos
        const freeQuery = query(collection(db, `users/${user.uid}/freeClips`), orderBy("createdAt", "desc"))
        const freeSnapshot = await getDocs(freeQuery)
        const freeData = freeSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as VideoItem[]

        // Fetch premium videos
        const premiumQuery = query(collection(db, `users/${user.uid}/premiumClips`), orderBy("createdAt", "desc"))
        const premiumSnapshot = await getDocs(premiumQuery)
        const premiumData = premiumSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as VideoItem[]

        setFreeVideos(freeData)
        setPremiumVideos(premiumData)
      } catch (error) {
        console.error("Error fetching videos:", error)
        toast({
          title: "Error",
          description: "Failed to load your videos",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchVideos()
  }, [user, toast])

  const handleDelete = async (videoId: string, contentType: string) => {
    if (!confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
      return
    }

    try {
      // Delete from Firestore
      await db.collection(`users/${user?.uid}/${contentType}Clips`).doc(videoId).delete()

      // Update local state
      if (contentType === "free") {
        setFreeVideos((prev) => prev.filter((video) => video.id !== videoId))
      } else {
        setPremiumVideos((prev) => prev.filter((video) => video.id !== videoId))
      }

      toast({
        title: "Success",
        description: "Video deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting video:", error)
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive",
      })
    }
  }

  const renderVideoCard = (video: VideoItem) => (
    <Card key={video.id} className="overflow-hidden bg-zinc-900 border-zinc-800">
      <div className="aspect-video relative overflow-hidden">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl || "/placeholder.svg"}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <span className="text-zinc-500">No thumbnail</span>
          </div>
        )}
        {video.contentType === "premium" && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
            <Lock className="w-3 h-3 mr-1" />
            Premium
          </div>
        )}
      </div>
      <CardHeader className="p-4 pb-2">
        <h3 className="font-medium text-white line-clamp-1">{video.title}</h3>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-zinc-400 text-sm line-clamp-2">{video.description || "No description"}</p>
        <div className="mt-2 text-xs text-zinc-500 flex items-center">
          <Eye className="w-3 h-3 mr-1" /> {video.views || 0} views
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-700 text-zinc-400 hover:text-white"
          onClick={() => handleDelete(video.id, video.contentType)}
        >
          <Trash2 className="w-4 h-4 mr-1" /> Delete
        </Button>
        <Link href={`/dashboard/videos/edit/${video.id}?type=${video.contentType}`}>
          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:text-white">
            <Edit className="w-4 h-4 mr-1" /> Edit
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">My Videos</h1>
        <Button onClick={() => router.push("/dashboard/upload")} className="bg-red-500 hover:bg-red-600 text-white">
          Upload New Video
        </Button>
      </div>

      <Tabs defaultValue="free" className="w-full">
        <TabsList className="bg-zinc-800 border-b border-zinc-700 w-full justify-start rounded-none p-0">
          <TabsTrigger
            value="free"
            className="data-[state=active]:bg-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            Free Videos ({freeVideos.length})
          </TabsTrigger>
          <TabsTrigger
            value="premium"
            className="data-[state=active]:bg-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            Premium Videos ({premiumVideos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="free" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden bg-zinc-900 border-zinc-800">
                  <div className="aspect-video bg-zinc-800 animate-pulse" />
                  <div className="p-4">
                    <div className="h-5 bg-zinc-800 rounded animate-pulse mb-2" />
                    <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
                  </div>
                </Card>
              ))}
            </div>
          ) : freeVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {freeVideos.map(renderVideoCard)}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-400">You haven't uploaded any free videos yet.</p>
              <Button
                onClick={() => router.push("/dashboard/upload")}
                variant="outline"
                className="mt-4 border-zinc-700 text-white"
              >
                Upload Your First Video
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="premium" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden bg-zinc-900 border-zinc-800">
                  <div className="aspect-video bg-zinc-800 animate-pulse" />
                  <div className="p-4">
                    <div className="h-5 bg-zinc-800 rounded animate-pulse mb-2" />
                    <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
                  </div>
                </Card>
              ))}
            </div>
          ) : premiumVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {premiumVideos.map(renderVideoCard)}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-400">You haven't uploaded any premium videos yet.</p>
              <Button
                onClick={() => router.push("/dashboard/upload")}
                variant="outline"
                className="mt-4 border-zinc-700 text-white"
              >
                Upload Your First Premium Video
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
