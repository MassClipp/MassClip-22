"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { Upload, MoreVertical, Lock, Eye, Trash2, Edit, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { fetchUserUploads, deleteUserVideo, updateVideoVisibility } from "@/lib/upload-utils"
import type { UserVideo } from "@/lib/types"

export default function MyUploadsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [uploads, setUploads] = useState<UserVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null)

  // Fetch user uploads
  useEffect(() => {
    if (!user) return

    const loadUploads = async () => {
      setIsLoading(true)
      try {
        const userUploads = await fetchUserUploads(user.uid)
        setUploads(userUploads)
      } catch (error) {
        console.error("Failed to fetch uploads:", error)
        toast({
          title: "Failed to load uploads",
          description: "There was an error loading your content.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadUploads()
  }, [user])

  // Handle video deletion
  const handleDeleteVideo = async (videoId: string) => {
    if (!user) return

    if (!confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
      return
    }

    setIsDeletingId(videoId)
    try {
      await deleteUserVideo(videoId, user.uid)
      setUploads(uploads.filter((upload) => upload.id !== videoId))
      toast({
        title: "Video deleted",
        description: "Your video has been deleted successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error("Failed to delete video:", error)
      toast({
        title: "Failed to delete video",
        description: "There was an error deleting your video.",
        variant: "destructive",
      })
    } finally {
      setIsDeletingId(null)
    }
  }

  // Handle visibility toggle
  const handleToggleVisibility = async (videoId: string, currentVisibility: boolean) => {
    if (!user) return

    setIsUpdatingId(videoId)
    try {
      await updateVideoVisibility(videoId, user.uid, !currentVisibility)

      // Update local state
      setUploads(
        uploads.map((upload) => (upload.id === videoId ? { ...upload, isPublic: !currentVisibility } : upload)),
      )

      toast({
        title: "Visibility updated",
        description: `Your video is now ${!currentVisibility ? "public" : "private"}.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Failed to update visibility:", error)
      toast({
        title: "Failed to update visibility",
        description: "There was an error updating your video's visibility.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingId(null)
    }
  }

  // Format upload date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown date"

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  }

  if (!user) {
    router.push("/login")
    return null
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-extralight tracking-tight text-white">My Uploads</h1>
                <p className="text-zinc-400 mt-1 font-light">Manage your uploaded content</p>
              </div>
              <Button className="bg-crimson hover:bg-crimson/90" onClick={() => router.push("/dashboard/uploads")}>
                <Upload className="h-4 w-4 mr-2" />
                Upload New
              </Button>
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center">
                <RefreshCw className="h-8 w-8 text-zinc-500 animate-spin" />
              </div>
            ) : uploads.length === 0 ? (
              <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm p-12 text-center">
                <CardContent className="pt-6">
                  <Upload className="h-12 w-12 mx-auto text-zinc-500 mb-4" />
                  <h3 className="text-xl font-light mb-2">No uploads yet</h3>
                  <p className="text-zinc-400 font-extralight mb-6">Upload your first video to get started</p>
                  <Button className="bg-crimson hover:bg-crimson/90" onClick={() => router.push("/dashboard/uploads")}>
                    Upload Video
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {uploads.map((video) => (
                  <motion.div key={video.id} variants={itemVariants}>
                    <Card className="overflow-hidden bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm hover:border-zinc-700 transition-colors">
                      <div className="relative aspect-video bg-zinc-800">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl || "/placeholder.svg"}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                            <Upload className="h-10 w-10 text-zinc-600" />
                          </div>
                        )}

                        {/* Visibility indicator */}
                        {!video.isPublic && (
                          <div className="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded-md flex items-center">
                            <Lock className="h-3 w-3 mr-1" />
                            Private
                          </div>
                        )}

                        {/* Action menu */}
                        <div className="absolute top-2 right-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 bg-black/80 text-white hover:bg-black hover:text-white rounded-full"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                              <DropdownMenuItem
                                className="cursor-pointer hover:bg-zinc-800"
                                onClick={() => handleToggleVisibility(video.id, video.isPublic)}
                                disabled={isUpdatingId === video.id}
                              >
                                {isUpdatingId === video.id ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    <span>Updating...</span>
                                  </>
                                ) : video.isPublic ? (
                                  <>
                                    <Lock className="h-4 w-4 mr-2" />
                                    <span>Make Private</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    <span>Make Public</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer hover:bg-zinc-800"
                                onClick={() => router.push(`/dashboard/uploads/edit/${video.id}`)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                <span>Edit Details</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-red-500 hover:bg-zinc-800 hover:text-red-400"
                                onClick={() => handleDeleteVideo(video.id)}
                                disabled={isDeletingId === video.id}
                              >
                                {isDeletingId === video.id ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    <span>Deleting...</span>
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    <span>Delete Video</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="font-medium text-white truncate mb-1" title={video.title}>
                          {video.title}
                        </h3>
                        <div className="text-xs text-zinc-400 mb-2">
                          <span className="px-2 py-0.5 bg-zinc-800 rounded-full">{video.category}</span>
                        </div>
                        <div className="text-xs text-zinc-500">Uploaded on {formatDate(video.createdAt)}</div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
