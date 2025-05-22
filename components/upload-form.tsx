"use client"

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react"
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Upload, ImageIcon, Tag, DollarSign, CheckCircle2, AlertCircle, Loader2, X, Plus, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface UploadFormProps {
  contentType: "free" | "premium"
}

export default function UploadForm({ contentType }: UploadFormProps) {
  const { user, refreshSession } = useAuth()
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
  const [showSessionError, setShowSessionError] = useState(false)
  const [isRefreshingSession, setIsRefreshingSession] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // Refresh session when component mounts
  useEffect(() => {
    const validateCurrentSession = async () => {
      try {
        setIsRefreshingSession(true)
        await refreshSession()
      } catch (error) {
        console.error("Failed to refresh session on component mount:", error)
      } finally {
        setIsRefreshingSession(false)
      }
    }

    validateCurrentSession()
  }, [refreshSession])

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

  // Clear selected file
  const clearSelectedFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview)
    setSelectedFile(null)
    setFilePreview(null)
    setDuration(0)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Clear selected thumbnail
  const clearSelectedThumbnail = () => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
    setSelectedThumbnail(null)
    setThumbnailPreview(null)
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ""
  }

  // Get a signed upload URL from the server
  const getSignedUploadUrl = async (file: File, fileType: string) => {
    try {
      console.log("Requesting signed upload URL for file:", file.name)

      // Try to refresh the session before making the request
      await refreshSession()

      const response = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          contentType: contentType,
        }),
        credentials: "include", // Important: include cookies with the request
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Failed to get upload URL:", errorData.error)

        // Check if this is an authentication error
        if (response.status === 401) {
          // Try to refresh the session one more time
          const refreshed = await refreshSession()

          if (refreshed) {
            // Try the request again
            const retryResponse = await fetch("/api/get-upload-url", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
                contentType: contentType,
              }),
              credentials: "include",
            })

            if (retryResponse.ok) {
              return await retryResponse.json()
            }
          }

          setShowSessionError(true)
        }

        throw new Error(errorData.error || "Failed to get upload URL")
      }

      const data = await response.json()
      console.log("Got signed upload URL successfully")
      return data
    } catch (error) {
      console.error("Error getting signed URL:", error)
      throw error
    }
  }

  // Upload file to R2 using the signed URL
  const uploadFileToR2 = async (file: File, signedUrl: string, onProgress: (progress: number) => void) => {
    return new Promise<void>((resolve, reject) => {
      console.log("Starting upload to R2 with signed URL")

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
          console.log("File uploaded successfully to R2")
          resolve()
        } else {
          console.error(`Upload failed with status: ${xhr.status}`)
          reject(new Error(`Upload failed with status: ${xhr.status}`))
        }
      }

      xhr.onerror = () => {
        console.error("Network error during upload")
        reject(new Error("Network error occurred during upload"))
      }

      xhr.send(file)
    })
  }

  // Handle session error - redirect to login
  const handleSessionError = () => {
    router.push("/login?redirect=/dashboard/upload")
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!user) {
      setUploadError("You must be logged in to upload content")
      setShowSessionError(true)
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

      // Refresh session before starting upload
      await refreshSession()

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
      console.log(`Clip saved to Firestore with ID: ${clipRef.id}`)

      // Also add to user's videos collection for easy access
      await setDoc(doc(db, `users/${user.uid}/videos`, clipRef.id), {
        clipId: clipRef.id,
        collectionName,
        title,
        thumbnailUrl: thumbnailPublicUrl || "",
        createdAt: serverTimestamp(),
        isPremium: contentType === "premium",
      })
      console.log("Clip reference added to user's videos collection")

      setUploadSuccess(true)
      setShowSuccessDialog(true)
      setIsUploading(false)
    } catch (error) {
      console.error("Upload error:", error)

      // Check if this is a session error
      if (
        error instanceof Error &&
        (error.message.includes("Authentication") ||
          error.message.includes("session") ||
          error.message.includes("log in"))
      ) {
        setShowSessionError(true)
      }

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
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-gray-800 dark:text-white">
                {contentType === "premium" ? "Upload Premium Content" : "Upload Content"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {contentType === "premium"
                  ? "Share exclusive content with your subscribers"
                  : "Share content with your audience"}
              </p>
            </div>
            {contentType === "premium" && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium">
                <DollarSign className="h-3.5 w-3.5" />
                <span>Premium</span>
              </div>
            )}
          </div>

          {/* Session refresh indicator */}
          {isRefreshingSession && (
            <div className="px-6 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30 flex items-center justify-center">
              <Loader2 className="h-3.5 w-3.5 text-blue-500 mr-2 animate-spin" />
              <p className="text-xs text-blue-600 dark:text-blue-400">Preparing secure upload environment...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6">
            {/* Video upload section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="video-upload" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Video
                </Label>
                {selectedFile && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatDuration(duration)}</span>
                )}
              </div>

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-lg p-4 text-center cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-zinc-800/30"
                >
                  <div className="py-8 flex flex-col items-center">
                    <div className="mb-3 p-3 rounded-full bg-gray-100 dark:bg-zinc-800">
                      <Upload className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload video</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">MP4, MOV or WebM (Max 500MB)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden bg-black">
                  <video src={filePreview!} className="w-full aspect-video object-contain" controls />
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white hover:bg-black/90 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-xs text-white">
                    {selectedFile.name}
                  </div>
                </div>
              )}
            </div>

            {/* Basic info section */}
            <div className="space-y-5">
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Title
                </Label>
                <Input
                  id="title"
                  placeholder="Enter a title for your content"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus-visible:ring-gray-300 dark:focus-visible:ring-zinc-600"
                />
              </div>

              <div>
                <Label
                  htmlFor="description"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block"
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your content"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus-visible:ring-gray-300 dark:focus-visible:ring-zinc-600 resize-none"
                />
              </div>

              <div>
                <Label htmlFor="tags" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Tags
                </Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                  <Input
                    id="tags"
                    placeholder="fitness, motivation, workout"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus-visible:ring-gray-300 dark:focus-visible:ring-zinc-600 pl-10"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Add relevant tags separated by commas</p>
              </div>

              {/* Advanced options toggle */}
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors mt-2"
              >
                {showAdvancedOptions ? (
                  <span className="flex items-center">
                    <span className="mr-1.5">Hide advanced options</span>
                    <X className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="mr-1.5">Show advanced options</span>
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>

              {/* Advanced options */}
              {showAdvancedOptions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5 pt-2"
                >
                  {/* Thumbnail upload */}
                  <div>
                    <Label
                      htmlFor="thumbnail-upload"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block"
                    >
                      Custom Thumbnail
                    </Label>
                    {!selectedThumbnail ? (
                      <div
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-lg p-3 text-center cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-zinc-800/30"
                      >
                        <div className="py-4 flex flex-col items-center">
                          <ImageIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mb-2" />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Click to upload a custom thumbnail (16:9)
                          </p>
                        </div>
                        <input
                          ref={thumbnailInputRef}
                          id="thumbnail-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleThumbnailChange}
                        />
                      </div>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden">
                        <img
                          src={thumbnailPreview! || "/placeholder.svg"}
                          alt="Thumbnail preview"
                          className="w-full aspect-video object-cover"
                        />
                        <button
                          type="button"
                          onClick={clearSelectedThumbnail}
                          className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white hover:bg-black/90 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comments toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="comments" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Allow Comments
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Let viewers comment on your content
                      </p>
                    </div>
                    <Switch
                      id="comments"
                      checked={allowComments}
                      onCheckedChange={setAllowComments}
                      className="data-[state=checked]:bg-gray-900 dark:data-[state=checked]:bg-gray-100 data-[state=checked]:text-white dark:data-[state=checked]:text-gray-900"
                    />
                  </div>

                  {/* Premium options */}
                  {contentType === "premium" && (
                    <>
                      <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-3">
                          <Label htmlFor="price" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Price (USD)
                          </Label>
                          <span className="text-sm font-medium text-amber-600 dark:text-amber-500">
                            ${price.toFixed(2)}
                          </span>
                        </div>
                        <Slider
                          id="price"
                          min={1}
                          max={50}
                          step={1}
                          value={[price]}
                          onValueChange={(value) => setPrice(value[0])}
                          className="my-4"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>$1.00</span>
                          <span>$25.00</span>
                          <span>$50.00</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="exclusive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Exclusive Content
                          </Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Mark as exclusive to highlight premium value
                          </p>
                        </div>
                        <Switch
                          id="exclusive"
                          checked={isExclusive}
                          onCheckedChange={setIsExclusive}
                          className="data-[state=checked]:bg-amber-500 dark:data-[state=checked]:bg-amber-500"
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </div>

            {/* Error message */}
            {uploadError && (
              <div className="mt-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress
                  value={uploadProgress}
                  className="h-1.5 bg-gray-100 dark:bg-zinc-800"
                  indicatorClassName="bg-gray-900 dark:bg-gray-100"
                />
              </div>
            )}

            {/* Submit button */}
            <div className="mt-8">
              <Button
                type="submit"
                disabled={isUploading || !selectedFile || isRefreshingSession}
                className={cn(
                  "w-full py-5 text-base font-medium transition-all",
                  "bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900",
                  "disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500",
                )}
              >
                {isUploading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </span>
                ) : isRefreshingSession ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Upload className="mr-2 h-4 w-4" />
                    Publish Content
                  </span>
                )}
              </Button>
            </div>
          </form>
        </motion.div>

        {/* Info text */}
        <div className="mt-4 flex items-start gap-2 px-4 text-xs text-gray-500 dark:text-gray-400">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <p>
            By uploading content, you agree to our{" "}
            <a href="/terms" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              Terms of Service
            </a>{" "}
            and confirm that your content doesn't violate any rights.
          </p>
        </div>
      </div>

      {/* Success dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Upload Successful
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Your content has been uploaded successfully and is now available on your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button
              onClick={resetForm}
              variant="outline"
              className="border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300"
            >
              Upload Another
            </Button>
            <Button
              onClick={goToProfile}
              className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900"
            >
              View My Profile
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session error dialog */}
      <AlertDialog open={showSessionError} onOpenChange={setShowSessionError}>
        <AlertDialogContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Session Expired
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Your session has expired or is invalid. Please log in again to continue uploading content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              onClick={handleSessionError}
              className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900"
            >
              Log In Again
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
