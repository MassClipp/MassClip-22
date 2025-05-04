"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { RefreshCw, Save, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchVideoById, updateVideoDetails } from "@/lib/upload-utils"
import type { UserVideo } from "@/lib/types"

// Predefined categories
const VIDEO_CATEGORIES = [
  "Morning Routine",
  "Workout",
  "Motivation",
  "Hustle Mentality",
  "Productivity",
  "Business Tips",
  "Lifestyle",
  "Fashion",
  "Food",
  "Travel",
  "Technology",
  "Other",
]

export default function EditVideoPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [video, setVideo] = useState<UserVideo | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [isPublic, setIsPublic] = useState(true)

  // Fetch video data
  useEffect(() => {
    if (!user || !params.id) return

    const loadVideo = async () => {
      setIsLoading(true)
      try {
        const videoData = await fetchVideoById(params.id, user.uid)

        if (!videoData) {
          toast({
            title: "Video not found",
            description: "The requested video could not be found.",
            variant: "destructive",
          })
          router.push("/dashboard/uploads/my-content")
          return
        }

        setVideo(videoData)
        setTitle(videoData.title || "")
        setDescription(videoData.description || "")
        setCategory(videoData.category || "")
        setIsPublic(videoData.isPublic ?? true)
      } catch (error) {
        console.error("Failed to fetch video:", error)
        toast({
          title: "Failed to load video",
          description: "There was an error loading the video details.",
          variant: "destructive",
        })
        router.push("/dashboard/uploads/my-content")
      } finally {
        setIsLoading(false)
      }
    }

    loadVideo()
  }, [user, params.id, router])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !video) return

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please provide a title for your video",
        variant: "destructive",
      })
      return
    }

    if (!category) {
      toast({
        title: "Category Required",
        description: "Please select a category for your video",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)

      // Update the video details
      await updateVideoDetails(video.id, user.uid, {
        title,
        description,
        category,
        isPublic,
      })

      toast({
        title: "Video Updated",
        description: "Your video details have been updated successfully",
        variant: "default",
      })

      // Redirect back to the user's uploads page
      router.push("/dashboard/uploads/my-content")
    } catch (error) {
      console.error("Update failed:", error)
      toast({
        title: "Update Failed",
        description: "There was an error updating your video. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
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
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-white mr-2"
                onClick={() => router.push("/dashboard/uploads/my-content")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-extralight tracking-tight text-white">Edit Video</h1>
                <p className="text-zinc-400 mt-1 font-light">Update your video details</p>
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center">
                <RefreshCw className="h-8 w-8 text-zinc-500 animate-spin" />
              </div>
            ) : video ? (
              <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                <form onSubmit={handleSubmit}>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-white text-xl font-light">Edit Video Details</CardTitle>
                    <CardDescription className="text-zinc-400">Update the information for your video</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Video Preview */}
                    <div className="space-y-4">
                      <div className="border border-zinc-700 rounded-lg overflow-hidden">
                        <div className="relative aspect-video bg-zinc-800">
                          {video.thumbnailUrl ? (
                            <img
                              src={video.thumbnailUrl || "/placeholder.svg"}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <RefreshCw className="h-10 w-10 text-zinc-600" />
                            </div>
                          )}
                        </div>
                        {video.videoUrl && (
                          <div className="p-4 bg-zinc-800/50">
                            <div className="flex items-center justify-between">
                              <div className="font-light text-sm truncate" title={video.fileName || video.title}>
                                {video.fileName || video.title}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Video Details */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title" className="text-base font-light">
                          Title <span className="text-crimson">*</span>
                        </Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="bg-zinc-800/50 border-zinc-700 mt-1.5"
                          placeholder="Enter a title for your video"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description" className="text-base font-light">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="bg-zinc-800/50 border-zinc-700 mt-1.5 h-24"
                          placeholder="Enter a description for your video (optional)"
                        />
                      </div>

                      <div>
                        <Label htmlFor="category" className="text-base font-light">
                          Category <span className="text-crimson">*</span>
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger id="category" className="bg-zinc-800/50 border-zinc-700 mt-1.5">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800">
                            {VIDEO_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch id="visibility" checked={isPublic} onCheckedChange={setIsPublic} />
                        <Label htmlFor="visibility" className="text-base font-light">
                          Make this video public
                        </Label>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex justify-between border-t border-zinc-800/40 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-zinc-700 bg-zinc-800/50"
                      onClick={() => router.push("/dashboard/uploads/my-content")}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-crimson hover:bg-crimson/90"
                      disabled={isSaving || !title || !category}
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            ) : (
              <div className="text-center py-12">
                <p>Video not found or you don't have permission to edit it.</p>
                <Button className="mt-4" onClick={() => router.push("/dashboard/uploads/my-content")}>
                  Back to My Uploads
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
