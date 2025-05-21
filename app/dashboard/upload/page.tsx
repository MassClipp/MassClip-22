"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Upload, AlertCircle, CheckCircle2, Film, Lock, Tag, Info } from "lucide-react"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { v4 as uuidv4 } from "uuid"

export default function UploadPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [category, setCategory] = useState("")
  const [isPremium, setIsPremium] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")

  const categories = [
    "Cinema",
    "Hustle Mentality",
    "Introspection",
    "Motivation",
    "Productivity",
    "Lifestyle",
    "Business",
    "Fitness",
    "Other",
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check if file is a video
      if (!selectedFile.type.startsWith("video/")) {
        setError("Please select a valid video file")
        return
      }

      // Check file size (limit to 500MB)
      if (selectedFile.size > 500 * 1024 * 1024) {
        setError("File size exceeds 500MB limit")
        return
      }

      setFile(selectedFile)
      setError("")
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check if file is an image
      if (!selectedFile.type.startsWith("image/")) {
        setError("Please select a valid image file for thumbnail")
        return
      }

      // Check file size (limit to 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("Thumbnail size exceeds 5MB limit")
        return
      }

      setThumbnail(selectedFile)
      setError("")
    }
  }

  const uploadToCloudflare = async (fileToUpload: File, isVideo: boolean): Promise<string> => {
    const fileId = uuidv4()
    const extension = fileToUpload.name.split(".").pop()
    const fileName = isVideo
      ? `videos/${user?.uid}/${fileId}.${extension}`
      : `thumbnails/${user?.uid}/${fileId}.${extension}`

    // Create a presigned URL for direct upload
    const response = await fetch("/api/get-upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName,
        contentType: fileToUpload.type,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to get upload URL")
    }

    const { uploadUrl, publicUrl } = await response.json()

    // Upload the file directly to Cloudflare R2
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: fileToUpload,
      headers: {
        "Content-Type": fileToUpload.type,
      },
    })

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file to Cloudflare R2")
    }

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError("You must be logged in to upload videos")
      return
    }

    if (!title || !description || !category || !file) {
      setError("Please fill in all required fields and select a video file")
      return
    }

    try {
      setUploading(true)
      setError("")

      // Upload video file
      const videoPublicUrl = await uploadToCloudflare(file, true)
      setVideoUrl(videoPublicUrl)

      // Upload thumbnail if provided, otherwise use a default
      let thumbnailPublicUrl = ""
      if (thumbnail) {
        thumbnailPublicUrl = await uploadToCloudflare(thumbnail, false)
      } else {
        // Use a default thumbnail based on category
        thumbnailPublicUrl = `/placeholder.svg?height=720&width=1280&query=video thumbnail for ${category}`
      }
      setThumbnailUrl(thumbnailPublicUrl)

      // Create video document in Firestore
      const videoId = uuidv4()
      const videoRef = doc(db, "videos", videoId)

      // Process tags
      const tagArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      await setDoc(videoRef, {
        id: videoId,
        title,
        description,
        category,
        tags: tagArray,
        videoUrl: videoPublicUrl,
        thumbnailUrl: thumbnailPublicUrl,
        creatorId: user.uid,
        createdAt: serverTimestamp(),
        isPremium,
        views: 0,
        likes: 0,
        downloads: 0,
      })

      // Add to user's videos collection
      const userVideoRef = doc(db, `users/${user.uid}/videos`, videoId)
      await setDoc(userVideoRef, {
        videoId,
        createdAt: serverTimestamp(),
        isPremium,
      })

      setSuccess(true)

      // Reset form after successful upload
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (err) {
      console.error("Upload error:", err)
      setError("Failed to upload video. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container max-w-5xl py-8 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-pink-600 text-transparent bg-clip-text">
          Upload New Clip
        </h1>
        <p className="text-muted-foreground mt-2">Share your content with the MassClip community</p>
      </div>

      {success ? (
        <Alert className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 mb-8">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <AlertTitle className="text-green-500">Upload Successful!</AlertTitle>
          <AlertDescription>Your video has been uploaded successfully. Redirecting to dashboard...</AlertDescription>
        </Alert>
      ) : error ? (
        <Alert variant="destructive" className="mb-8">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Upload Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-black/40 backdrop-blur-sm border border-white/10">
        <CardHeader>
          <CardTitle>Video Details</CardTitle>
          <CardDescription>Fill in the information about your clip</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="premium-toggle" className="text-base font-medium">
                    Clip Type
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {isPremium ? "Premium (paid) content" : "Free content"}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="premium-toggle" className={isPremium ? "text-orange-500" : "text-muted-foreground"}>
                    {isPremium ? <Lock className="h-4 w-4 inline mr-1" /> : null}
                    Premium
                  </Label>
                  <Switch
                    id="premium-toggle"
                    checked={isPremium}
                    onCheckedChange={setIsPremium}
                    className={isPremium ? "bg-gradient-to-r from-orange-500 to-pink-600" : ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Enter a catchy title for your clip"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-black/60 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your clip"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="min-h-[100px] bg-black/60 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="flex items-center">
                  <Tag className="h-4 w-4 mr-1" />
                  Tags
                </Label>
                <Input
                  id="tags"
                  placeholder="Enter tags separated by commas (e.g., motivation, success, business)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="bg-black/60 border-white/10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="video" className="flex items-center">
                    <Film className="h-4 w-4 mr-1" />
                    Video File <span className="text-red-500">*</span>
                  </Label>
                  <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center hover:bg-white/5 transition-colors cursor-pointer">
                    <input id="video" type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                    <label htmlFor="video" className="cursor-pointer">
                      {file ? (
                        <div className="text-sm">
                          <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
                          <p className="font-medium text-green-500">{file.name}</p>
                          <p className="text-muted-foreground mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="font-medium">Click to upload video</p>
                          <p className="text-xs text-muted-foreground mt-1">MP4, MOV, or WebM (max 500MB)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail" className="flex items-center">
                    <Info className="h-4 w-4 mr-1" />
                    Thumbnail (Optional)
                  </Label>
                  <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center hover:bg-white/5 transition-colors cursor-pointer">
                    <input
                      id="thumbnail"
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="hidden"
                    />
                    <label htmlFor="thumbnail" className="cursor-pointer">
                      {thumbnail ? (
                        <div className="text-sm">
                          <div className="w-full h-20 mb-2 mx-auto relative">
                            <img
                              src={URL.createObjectURL(thumbnail) || "/placeholder.svg"}
                              alt="Thumbnail preview"
                              className="w-full h-full object-cover rounded"
                            />
                          </div>
                          <p className="font-medium text-green-500">{thumbnail.name}</p>
                          <p className="text-muted-foreground mt-1">{(thumbnail.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="font-medium">Click to upload thumbnail</p>
                          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or WebP (max 5MB)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={uploading || !file || !title || !description || !category}
                className={`w-full ${isPremium ? "bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700" : ""}`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>Upload Clip</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
