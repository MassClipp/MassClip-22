"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { Upload, ImageIcon, X, Check, AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { uploadVideo, generateThumbnail } from "@/lib/upload-utils"

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

export default function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false)

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    // Validate file type
    if (!file.type.includes("video/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a video file (MP4 or MOV)",
        variant: "destructive",
      })
      return
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 100MB",
        variant: "destructive",
      })
      return
    }

    setVideoFile(file)

    // Create a preview URL
    const previewUrl = URL.createObjectURL(file)
    setVideoPreview(previewUrl)

    // Auto-generate a thumbnail
    handleGenerateThumbnail(file)
  }

  // Generate a thumbnail from the video
  const handleGenerateThumbnail = async (file: File) => {
    setGeneratingThumbnail(true)
    try {
      const thumbnailDataUrl = await generateThumbnail(file)
      setThumbnail(thumbnailDataUrl)
    } catch (error) {
      console.error("Failed to generate thumbnail:", error)
      toast({
        title: "Thumbnail Generation Failed",
        description: "We couldn't generate a thumbnail automatically. You can upload one manually.",
        variant: "destructive",
      })
    } finally {
      setGeneratingThumbnail(false)
    }
  }

  // Handle custom thumbnail upload
  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    // Validate file type
    if (!file.type.includes("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file for the thumbnail",
        variant: "destructive",
      })
      return
    }

    setCustomThumbnail(file)

    // Create a preview URL
    const previewUrl = URL.createObjectURL(file)
    setThumbnail(previewUrl)
  }

  // Remove selected video
  const handleRemoveVideo = () => {
    setVideoFile(null)
    setVideoPreview(null)
    setThumbnail(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Submit the upload form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload videos",
        variant: "destructive",
      })
      return
    }

    if (!videoFile) {
      toast({
        title: "No Video Selected",
        description: "Please select a video to upload",
        variant: "destructive",
      })
      return
    }

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
      setIsUploading(true)

      // Upload the video and metadata
      await uploadVideo({
        file: videoFile,
        thumbnailFile: customThumbnail,
        thumbnailDataUrl: !customThumbnail ? thumbnail : null,
        title,
        description,
        category,
        isPublic,
        userId: user.uid,
        onProgress: (progress) => {
          setUploadProgress(progress)
        },
      })

      toast({
        title: "Upload Successful",
        description: "Your video has been uploaded successfully",
        variant: "default",
      })

      // Redirect to the user's uploads page
      router.push("/dashboard/uploads/my-content")
    } catch (error) {
      console.error("Upload failed:", error)
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your video. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-extralight tracking-tight text-white">Upload New Content</h1>
                <p className="text-zinc-400 mt-1 font-light">Share your videos with the MassClip community</p>
              </div>
              <Button
                variant="outline"
                className="border-zinc-800 bg-zinc-900/30 text-white hover:bg-zinc-900/50 hover:border-zinc-700"
                onClick={() => router.push("/dashboard/uploads/my-content")}
              >
                My Uploads
              </Button>
            </div>

            <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
              <form onSubmit={handleSubmit}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-white text-xl font-light">Upload Video</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Upload your video in MP4 or MOV format (max 100MB)
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Video Upload */}
                  <div className="space-y-4">
                    {!videoFile ? (
                      <div
                        className="border-2 border-dashed border-zinc-700 rounded-lg p-12 text-center hover:border-crimson hover:bg-zinc-800/20 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center">
                          <Upload className="h-12 w-12 text-zinc-500 mb-4" />
                          <h3 className="text-lg font-light mb-2">Drag & drop your video here</h3>
                          <p className="text-zinc-400 font-extralight mb-6">MP4 or MOV format, max 100MB</p>
                          <Button
                            type="button"
                            variant="outline"
                            className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                          >
                            Select Video
                          </Button>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/mp4,video/quicktime"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </div>
                    ) : (
                      <div className="border border-zinc-700 rounded-lg overflow-hidden">
                        <div className="relative aspect-video bg-zinc-800">
                          {videoPreview && (
                            <video src={videoPreview} className="w-full h-full object-contain" controls />
                          )}
                          <button
                            type="button"
                            className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full hover:bg-black"
                            onClick={handleRemoveVideo}
                          >
                            <X className="h-5 w-5 text-white" />
                          </button>
                        </div>
                        <div className="p-4 bg-zinc-800/50">
                          <div className="flex items-center justify-between">
                            <div className="font-light text-sm truncate" title={videoFile.name}>
                              {videoFile.name}
                            </div>
                            <div className="text-xs text-zinc-400">
                              {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Section */}
                  {videoFile && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-light">Video Thumbnail</Label>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="thumbnail-upload"
                          onChange={handleThumbnailChange}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-xs"
                            onClick={() => document.getElementById("thumbnail-upload")?.click()}
                          >
                            <ImageIcon className="h-3.5 w-3.5 mr-1" /> Custom
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-xs"
                            onClick={() => videoFile && handleGenerateThumbnail(videoFile)}
                            disabled={generatingThumbnail}
                          >
                            {generatingThumbnail ? (
                              <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            )}
                            Generate
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="col-span-1">
                          <div className="border border-zinc-700 rounded-lg overflow-hidden">
                            <div className="aspect-video bg-zinc-800 flex items-center justify-center">
                              {thumbnail ? (
                                <img
                                  src={thumbnail || "/placeholder.svg"}
                                  alt="Video thumbnail"
                                  className="w-full h-full object-cover"
                                />
                              ) : generatingThumbnail ? (
                                <RefreshCw className="h-8 w-8 text-zinc-500 animate-spin" />
                              ) : (
                                <Image className="h-8 w-8 text-zinc-500" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="col-span-2 flex items-center">
                          <div className="text-zinc-400 text-sm font-light">
                            {customThumbnail ? (
                              <div className="flex items-center">
                                <Check className="h-4 w-4 text-green-500 mr-2" />
                                Custom thumbnail selected
                              </div>
                            ) : thumbnail ? (
                              <div className="flex items-center">
                                <Check className="h-4 w-4 text-green-500 mr-2" />
                                Auto-generated thumbnail created
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                                No thumbnail available. We'll generate one automatically on upload.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-crimson hover:bg-crimson/90"
                    disabled={isUploading || !videoFile || !title || !category}
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Uploading... {uploadProgress.toFixed(0)}%
                      </>
                    ) : (
                      <>Upload Video</>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
