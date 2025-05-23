"use client"

import { useState, useRef, type ChangeEvent, type FormEvent, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Video, Upload, User, Lock, DollarSign, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { auth, db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { v4 as uuidv4 } from "uuid"

export default function UploadForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPremium, setIsPremium] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (500MB limit)
      if (file.size > 500 * 1024 * 1024) {
        setError("File size exceeds 500MB limit")
        return
      }

      setSelectedFile(file)
      setError(null)

      // Create a preview URL for the video
      const fileURL = URL.createObjectURL(file)
      setFilePreview(fileURL)
    }
  }

  // Generate a thumbnail from the video
  const generateThumbnail = async (videoFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement("video")
        video.preload = "metadata"
        video.muted = true
        video.playsInline = true

        const fileURL = URL.createObjectURL(videoFile)
        video.src = fileURL

        video.onloadeddata = () => {
          // Seek to 25% of the video
          video.currentTime = video.duration * 0.25
        }

        video.onseeked = () => {
          // Create canvas and draw video frame
          const canvas = document.createElement("canvas")
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight

          const ctx = canvas.getContext("2d")
          if (!ctx) {
            URL.revokeObjectURL(fileURL)
            reject(new Error("Could not get canvas context"))
            return
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Convert to blob
          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                URL.revokeObjectURL(fileURL)
                reject(new Error("Could not create thumbnail blob"))
                return
              }

              // Upload thumbnail to R2
              try {
                const thumbnailFile = new File([blob], `thumbnail-${uuidv4()}.jpg`, { type: "image/jpeg" })
                const thumbnailUrl = await uploadFileToR2(thumbnailFile)
                URL.revokeObjectURL(fileURL)
                resolve(thumbnailUrl)
              } catch (error) {
                URL.revokeObjectURL(fileURL)
                reject(error)
              }
            },
            "image/jpeg",
            0.95,
          )
        }

        video.onerror = () => {
          URL.revokeObjectURL(fileURL)
          reject(new Error("Error loading video for thumbnail generation"))
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  // Upload file to R2
  const uploadFileToR2 = async (file: File): Promise<string> => {
    try {
      console.log(`Starting upload to R2: ${file.name} (${file.type})`)

      // Get pre-signed URL from your API
      const response = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: `${uuidv4()}-${file.name}`,
          fileType: file.type,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error("Error getting upload URL:", errorData)
        throw new Error(`Failed to get upload URL: ${response.status}`)
      }

      const { uploadUrl, publicUrl } = await response.json()
      console.log("Got upload URL:", uploadUrl)
      console.log("Public URL will be:", publicUrl)

      // Upload to R2 using the pre-signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error("Error uploading to R2:", errorText)
        throw new Error(`Failed to upload file: ${uploadResponse.status}`)
      }

      console.log("Successfully uploaded to R2:", publicUrl)
      return publicUrl
    } catch (error) {
      console.error("Error in uploadFileToR2:", error)
      throw error
    }
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!selectedFile || !title.trim()) {
      setError("Please provide a title and select a video file")
      return
    }

    try {
      setIsUploading(true)
      setError(null)
      setUploadProgress(0)

      // Get current user
      const user = auth.currentUser
      if (!user) {
        throw new Error("You must be logged in to upload videos")
      }

      console.log(`Starting upload process for ${isPremium ? "PREMIUM" : "FREE"} video: ${title}`)

      // 1. Generate and upload thumbnail
      console.log("Generating thumbnail...")
      const thumbnailUrl = await generateThumbnail(selectedFile)
      setThumbnailUrl(thumbnailUrl)
      console.log("Thumbnail generated and uploaded:", thumbnailUrl)

      // 2. Upload video file to R2
      console.log("Uploading video file...")
      setUploadProgress(20)
      const videoUrl = await uploadFileToR2(selectedFile)
      setUploadedVideoUrl(videoUrl)
      console.log("Video uploaded successfully:", videoUrl)
      setUploadProgress(80)

      // 3. Save video metadata to Firestore
      console.log("Saving video metadata to Firestore...")
      console.log(`Video type: ${isPremium ? "premium" : "free"}`)

      const videoData = {
        title: title.trim(),
        description: description.trim(),
        type: isPremium ? "premium" : "free", // This is the critical field!
        status: "active",
        isPublic: true,
        url: videoUrl,
        thumbnailUrl: thumbnailUrl,
        uid: user.uid,
        username: user.displayName || "unknown",
        email: user.email,
        createdAt: serverTimestamp(),
        views: 0,
        likes: 0,
        fileSize: selectedFile.size,
        duration: 0, // You could extract this if needed
      }

      // Log the exact data being saved
      console.log("Saving to Firestore with data:", JSON.stringify(videoData, null, 2))

      const docRef = await addDoc(collection(db, "videos"), videoData)
      console.log("Video metadata saved to Firestore with ID:", docRef.id)

      setUploadProgress(100)

      // Reset form
      setSelectedFile(null)
      setFilePreview(null)
      setTitle("")
      setDescription("")
      setIsPremium(false)

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Error uploading video:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setIsUploading(false)
    }
  }

  // Add cleanup for the preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview)
      }
    }
  }, [filePreview])

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center text-white mb-6">Upload Your Content</h1>

      <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center">
          <Video className="h-5 w-5 text-red-500 mr-2" />
          <h2 className="text-xl font-semibold text-white">Upload Content</h2>
        </div>

        <div className="p-1 border-b border-zinc-800 flex items-center text-sm text-zinc-400 px-6">
          <User className="h-3.5 w-3.5 mr-2" />
          <span>
            Uploading as <span className="text-red-500">{auth.currentUser?.displayName || "@user"}</span>
          </span>
        </div>

        {error && (
          <div className="m-6 p-4 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6">
          {/* Content Type Toggle */}
          <div className="mb-6">
            <div className="flex justify-center space-x-2 w-full">
              <button
                type="button"
                onClick={() => setIsPremium(false)}
                className={cn(
                  "py-2 px-4 rounded-l-md flex-1 flex items-center justify-center gap-2 transition-colors",
                  !isPremium ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700",
                )}
              >
                <span>Free</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPremium(true)}
                className={cn(
                  "py-2 px-4 rounded-r-md flex-1 flex items-center justify-center gap-2 transition-colors",
                  isPremium ? "bg-amber-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700",
                )}
              >
                <Lock className="h-4 w-4" />
                <span>Premium</span>
              </button>
            </div>

            {isPremium && (
              <div className="mt-3 p-3 bg-zinc-800/30 border border-amber-500/20 rounded text-sm text-zinc-400 flex items-start">
                <DollarSign className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                <p>
                  Premium videos will be available only to paying subscribers. Price is set in your profile settings.
                </p>
              </div>
            )}
          </div>

          {/* Video File */}
          <div className="mb-6">
            <label className="block text-white mb-2">Video File</label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
                "hover:bg-zinc-800/30",
                selectedFile
                  ? isPremium
                    ? "border-amber-500/50 bg-amber-500/5"
                    : "border-red-500/50 bg-red-500/5"
                  : "border-zinc-700 bg-zinc-800/30",
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
                  <p className="text-white">Click to upload video</p>
                  <p className="text-xs text-zinc-500 mt-1">MP4, MOV or WebM (Max 500MB)</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            </div>
            {selectedFile && (
              <div className="mt-2 text-sm flex justify-between">
                <span className={isPremium ? "text-amber-400" : "text-red-400"}>{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFile(null)
                    setFilePreview(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-white mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              placeholder="Enter a title for your video"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-white mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              placeholder="Describe your video"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 text-white focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
            />
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="mb-6">
              <div className="w-full bg-zinc-800 rounded-full h-2.5 mb-2">
                <div
                  className={`h-2.5 rounded-full ${isPremium ? "bg-amber-500" : "bg-red-600"}`}
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-zinc-400 text-right">{uploadProgress}% Complete</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isUploading || !selectedFile || !title.trim()}
            className={cn(
              "w-full py-3 rounded-md font-medium text-white transition-colors",
              isPremium ? "bg-amber-500 hover:bg-amber-600" : "bg-red-600 hover:bg-red-700",
              (isUploading || !selectedFile || !title.trim()) && "opacity-50 cursor-not-allowed",
            )}
          >
            {isUploading ? "Uploading..." : isPremium ? "Publish Premium Video" : "Publish Video"}
          </button>
        </form>
      </div>
    </div>
  )
}
