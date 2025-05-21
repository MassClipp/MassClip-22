"use client"

import { useState, useRef, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Upload, Video, ImageIcon, Tag, DollarSign, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadFormProps {
  contentType: "free" | "premium"
}

export default function UploadForm({ contentType }: UploadFormProps) {
  const { user, getIdToken } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [price, setPrice] = useState(5)
  const [duration, setDuration] = useState(0)
  const [allowComments, setAllowComments] = useState(true)
  const [isExclusive, setIsExclusive] = useState(false)

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  // Handle video file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)

    // Create preview for video
    const fileURL = URL.createObjectURL(file)
    setFilePreview(fileURL)

    // Get video duration if possible
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      setDuration(Math.round(video.duration))
      video.remove()
    }
    video.src = fileURL
  }

  // Handle thumbnail selection
  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedThumbnail(file)

    // Create preview for thumbnail
    const fileURL = URL.createObjectURL(file)
    setThumbnailPreview(fileURL)
  }

  // Format duration to MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Get a signed upload URL from the server
  const getSignedUploadUrl = async (file: File, fileType: string) => {
    try {
      const token = await getIdToken()

      if (!token) {
        throw new Error("Authentication token not available")
      }

      const response = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          contentType: contentType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to get upload URL")
      }

      return await response.json()
    } catch (error) {
      console.error("Error getting signed URL:", error)
      throw error
    }
  }

  // Upload file to R2 using the signed URL
  const uploadFileToR2 = async (file: File, signedUrl: string, onProgress: (progress: number) => void) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.open("PUT", signedUrl, true)
      xhr.setRequestHeader("Content-Type", file.type)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          onProgress(percentComplete)
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`))
        }
      }

      xhr.onerror = () => {
        reject(new Error("Network error occurred during upload"))
      }

      xhr.send(file)
    })
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!user) {
      setUploadError("You must be logged in to upload content")
      return
    }

    if (!selectedFile) {
      setUploadError("Please select a video file to upload")
      return
    }

    try {
      setIsUploading(true)
      setUploadError(null)
      setUploadProgress(0)

      // Step 1: Get signed URL for video upload
      const videoUploadData = await getSignedUploadUrl(selectedFile, "video")

      // Step 2: Upload video to R2
      await uploadFileToR2(selectedFile, videoUploadData.uploadUrl, (progress) => {
        setUploadProgress(progress * 0.8) // Video is 80% of total progress
      })

      // Variables to store URLs
      let thumbnailPublicUrl = ""

      // Step 3: Upload thumbnail if provided
      if (selectedThumbnail) {
        setUploadProgress(80) // Video upload complete

        const thumbnailUploadData = await getSignedUploadUrl(selectedThumbnail, "image")
        await uploadFileToR2(selectedThumbnail, thumbnailUploadData.uploadUrl, (progress) => {
          setUploadProgress(80 + progress * 0.2) // Thumbnail is 20% of total progress
        })

        thumbnailPublicUrl = thumbnailUploadData.publicUrl
      }

      setUploadProgress(100)

      // Step 4: Save clip data to Firestore
      const clipData = {
        title,
        description,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        videoUrl: videoUploadData.publicUrl,
        thumbnailUrl: thumbnailPublicUrl || "",
        duration,
        creatorId: user.uid,
        createdAt: serverTimestamp(),
        isPremium: contentType === "premium",
        price: contentType === "premium" ? price : 0,
        allowComments,
        isExclusive: contentType === "premium" && isExclusive,
        views: 0,
        likes: 0,
      }

      // Add to appropriate collection based on type
      const collectionName = contentType === "premium" ? "premiumClips" : "freeClips"
      const clipRef = await addDoc(collection(db, collectionName), clipData)

      // Also add to user's videos collection for easy access
      await setDoc(doc(db, `users/${user.uid}/videos`, clipRef.id), {
        clipId: clipRef.id,
        collectionName,
        title,
        thumbnailUrl: thumbnailPublicUrl || "",
        createdAt: serverTimestamp(),
        isPremium: contentType === "premium",
      })

      setUploadSuccess(true)
      setShowSuccessDialog(true)
      setIsUploading(false)
    } catch (error) {
      console.error("Upload error:", error)
      setUploadError(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.")
      setIsUploading(false)
    }
  }

  // Reset form after successful upload
  const resetForm = () => {
    setTitle("")
    setDescription("")
    setTags("")
    setPrice(5)
    setDuration(0)
    setAllowComments(true)
    setIsExclusive(false)
    setSelectedFile(null)
    setSelectedThumbnail(null)
    setFilePreview(null)
    setThumbnailPreview(null)
    setUploadProgress(0)
    setUploadSuccess(false)
  }

  // Navigate to profile after upload
  const goToProfile = () => {
    if (user?.username) {
      router.push(`/creator/${user.username}`)
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <Card className="bg-zinc-900/60 backdrop-blur-sm border-zinc-800/50 text-white overflow-hidden">
          <CardHeader
            className={cn(
              "pb-4",
              contentType === "premium"
                ? "bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-b border-amber-500/20"
                : "bg-gradient-to-r from-red-500/10 to-red-600/10 border-b border-red-500/20",
            )}
          >
            <CardTitle className="flex items-center gap-2">
              {contentType === "premium" ? (
                <>
                  <DollarSign className="h-5 w-5 text-amber-500" />
                  <span>Upload Premium Content</span>
                </>
              ) : (
                <>
                  <Video className="h-5 w-5 text-red-500" />
                  <span>Upload Free Content</span>
                </>
              )}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {contentType === "premium"
                ? "Share exclusive content with your paying subscribers"
                : "Share free content with everyone to grow your audience"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left column - File uploads */}
                <div className="md:col-span-1 space-y-6">
                  {/* Video upload */}
                  <div>
                    <Label htmlFor="video-upload" className="block mb-2 text-sm font-medium">
                      Video File
                    </Label>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
                        "hover:bg-zinc-800/30 hover:border-zinc-700",
                        selectedFile ? "border-green-500/50 bg-green-500/5" : "border-zinc-700 bg-zinc-800/30",
                      )}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {filePreview ? (
                        <div className="aspect-video relative rounded overflow-hidden bg-black">
                          <video src={filePreview} className="w-full h-full object-contain" controls />
                        </div>
                      ) : (
                        <div className="py-8 flex flex-col items-center">
                          <Upload className="h-10 w-10 text-zinc-500 mb-2" />
                          <p className="text-sm font-medium">Click to upload video</p>
                          <p className="text-xs text-zinc-500 mt-1">MP4, MOV or WebM (Max 500MB)</p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        id="video-upload"
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                    {selectedFile && (
                      <div className="mt-2 text-xs text-zinc-400 flex justify-between">
                        <span>{selectedFile.name}</span>
                        <span>{formatDuration(duration)}</span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail upload */}
                  <div>
                    <Label htmlFor="thumbnail-upload" className="block mb-2 text-sm font-medium">
                      Custom Thumbnail (Optional)
                    </Label>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
                        "hover:bg-zinc-800/30 hover:border-zinc-700",
                        selectedThumbnail ? "border-green-500/50 bg-green-500/5" : "border-zinc-700 bg-zinc-800/30",
                      )}
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      {thumbnailPreview ? (
                        <div className="aspect-video relative rounded overflow-hidden bg-black">
                          <img
                            src={thumbnailPreview || "/placeholder.svg"}
                            alt="Thumbnail preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="py-6 flex flex-col items-center">
                          <ImageIcon className="h-8 w-8 text-zinc-500 mb-2" />
                          <p className="text-sm font-medium">Click to upload thumbnail</p>
                          <p className="text-xs text-zinc-500 mt-1">JPG or PNG (16:9 ratio)</p>
                        </div>
                      )}
                      <input
                        ref={thumbnailInputRef}
                        id="thumbnail-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleThumbnailChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Right column - Metadata */}
                <div className="md:col-span-2 space-y-6">
                  {/* Title */}
                  <div>
                    <Label htmlFor="title" className="block mb-2 text-sm font-medium">
                      Title
                    </Label>
                    <Input
                      id="title"
                      placeholder="Enter a catchy title for your clip"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description" className="block mb-2 text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your clip to help viewers find it"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white resize-none"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <Label htmlFor="tags" className="block mb-2 text-sm font-medium">
                      Tags (comma separated)
                    </Label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4" />
                      <Input
                        id="tags"
                        placeholder="fitness, motivation, workout"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white pl-10"
                      />
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Add relevant tags to help users discover your content</p>
                  </div>

                  {/* Premium options */}
                  {contentType === "premium" && (
                    <>
                      <Separator className="my-6 bg-zinc-800" />

                      <div>
                        <Label htmlFor="price" className="block mb-4 text-sm font-medium flex justify-between">
                          <span>Price (USD)</span>
                          <span className="text-amber-500 font-semibold">${price.toFixed(2)}</span>
                        </Label>
                        <Slider
                          id="price"
                          min={1}
                          max={50}
                          step={1}
                          value={[price]}
                          onValueChange={(value) => setPrice(value[0])}
                          className="my-6"
                        />
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>$1.00</span>
                          <span>$25.00</span>
                          <span>$50.00</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="exclusive" className="text-sm font-medium">
                            Exclusive Content
                          </Label>
                          <p className="text-xs text-zinc-500">Mark as exclusive to highlight premium value</p>
                        </div>
                        <Switch id="exclusive" checked={isExclusive} onCheckedChange={setIsExclusive} />
                      </div>
                    </>
                  )}

                  {/* Comments toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="comments" className="text-sm font-medium">
                        Allow Comments
                      </Label>
                      <p className="text-xs text-zinc-500">Let viewers comment on your content</p>
                    </div>
                    <Switch id="comments" checked={allowComments} onCheckedChange={setAllowComments} />
                  </div>
                </div>
              </div>

              {/* Error message */}
              {uploadError && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-200">{uploadError}</p>
                </div>
              )}

              {/* Upload progress */}
              {isUploading && (
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Submit button */}
              <CardFooter className="px-0 pt-6 pb-0 mt-6">
                <Button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className={cn(
                    "w-full py-6 text-base font-medium",
                    contentType === "premium"
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
                      : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white",
                  )}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      {contentType === "premium" ? "Publish Premium Content" : "Publish Free Content"}
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Success dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Upload Successful!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Your {contentType} content has been uploaded successfully and is now available on your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={resetForm} className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Upload Another
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={goToProfile}
              className={cn(
                contentType === "premium"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
                  : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white",
              )}
            >
              View My Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
