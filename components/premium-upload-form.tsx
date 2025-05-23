"use client"

import type React from "react"

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, setDoc } from "firebase/firestore"
import { Upload, User, Lock, DollarSign, X, ImageIcon, Tag, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

export default function PremiumUploadForm() {
  const { user } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState<number>(5.99)
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState("")
  const [allowComments, setAllowComments] = useState(true)

  // Creator profile state
  const [creatorUsername, setCreatorUsername] = useState<string>("")
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Fetch the creator profile information
  useEffect(() => {
    async function fetchCreatorProfile() {
      if (!user) {
        setIsLoadingProfile(false)
        return
      }

      try {
        console.log("Fetching creator profile for UID:", user.uid)

        // First check if there's a document with the user's UID as the ID
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        let userData: any = null

        if (userDoc.exists()) {
          userData = userDoc.data()
          console.log("Found user document by ID:", userData)

          if (userData.username) {
            setCreatorUsername(userData.username)
            setIsLoadingProfile(false)
            return
          }
        }

        // If not found by direct ID, try querying
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("uid", "==", user.uid))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          userData = querySnapshot.docs[0].data()
          console.log("Found creator profile by UID query:", userData)

          if (userData.username) {
            setCreatorUsername(userData.username)
            setIsLoadingProfile(false)
            return
          }
        }

        // If not found by UID, try to find by email
        if (user.email) {
          const emailQuery = query(usersRef, where("email", "==", user.email))
          const emailSnapshot = await getDocs(emailQuery)

          if (!emailSnapshot.empty) {
            userData = emailSnapshot.docs[0].data()
            console.log("Found creator profile by email:", userData)

            if (userData.username) {
              setCreatorUsername(userData.username)
              setIsLoadingProfile(false)
              return
            }
          }
        }

        if (!userData || !userData.username) {
          console.error("No username found in user document")
          setUploadError("Your creator profile is missing a username. Please set up your profile first.")
        }
      } catch (error) {
        console.error("Error fetching creator profile:", error)
        setUploadError("Failed to load your creator profile information. Please try again.")
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchCreatorProfile()
  }, [user])

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

  // Handle thumbnail file selection
  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setThumbnailFile(file)

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

  // Handle tag input
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && currentTag.trim()) {
      e.preventDefault()
      if (!tags.includes(currentTag.trim())) {
        setTags([...tags, currentTag.trim()])
      }
      setCurrentTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  // Get a signed upload URL from the server
  const getSignedUploadUrl = async (file: File) => {
    try {
      console.log("Requesting signed upload URL for file:", file.name)

      // Create a sanitized title for the filename
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()
      const timestamp = Date.now()

      // Format: {creatorUsername}/{title}-{timestamp}.mp4
      const fileName = `premium/${creatorUsername}/${sanitizedTitle}-${timestamp}.${file.name.split(".").pop()}`

      const response = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          fileType: file.type,
        }),
        credentials: "include", // Include cookies with the request
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Failed to get upload URL:", errorData.error)
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

  // Get a signed upload URL for thumbnail
  const getSignedThumbnailUrl = async (file: File) => {
    try {
      console.log("Requesting signed upload URL for thumbnail:", file.name)

      // Create a sanitized title for the filename
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()
      const timestamp = Date.now()

      // Format: thumbnails/{creatorUsername}/{title}-{timestamp}.jpg
      const fileName = `thumbnails/${creatorUsername}/${sanitizedTitle}-${timestamp}.${file.name.split(".").pop()}`

      const response = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          fileType: file.type,
        }),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Failed to get thumbnail upload URL:", errorData.error)
        throw new Error(errorData.error || "Failed to get thumbnail upload URL")
      }

      const data = await response.json()
      console.log("Got signed thumbnail upload URL successfully")
      return data
    } catch (error) {
      console.error("Error getting thumbnail signed URL:", error)
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

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!user) {
      setUploadError("You must be logged in to upload content")
      return
    }

    if (!creatorUsername) {
      setUploadError("Your creator profile is missing a username. Please set up your profile first.")
      return
    }

    if (!selectedFile) {
      setUploadError("Please select a video file to upload")
      return
    }

    if (!title.trim()) {
      setUploadError("Please enter a title for your video")
      return
    }

    if (tags.length === 0) {
      setUploadError("Please add at least one tag for your video")
      return
    }

    if (price <= 0) {
      setUploadError("Please enter a valid price greater than 0")
      return
    }

    try {
      setIsUploading(true)
      setUploadError(null)
      setUploadProgress(0)

      // Step 1: Get signed URL for video upload
      const uploadData = await getSignedUploadUrl(selectedFile)

      // Step 2: Upload video to R2
      await uploadFileToR2(selectedFile, uploadData.uploadUrl, (progress) => {
        setUploadProgress(progress * 0.8) // Video is 80% of total progress
      })

      // Step 3: Upload thumbnail if provided
      let thumbnailUrl = ""
      if (thumbnailFile) {
        const thumbnailData = await getSignedThumbnailUrl(thumbnailFile)
        await uploadFileToR2(thumbnailFile, thumbnailData.uploadUrl, (progress) => {
          // Thumbnail is 20% of total progress, starting from 80%
          setUploadProgress(80 + progress * 0.2)
        })
        thumbnailUrl = thumbnailData.publicUrl
      }

      setUploadProgress(100)

      // Step 4: Save video data to Firestore
      const videoData = {
        uid: user.uid,
        username: creatorUsername,
        title,
        description: description || "",
        tags,
        url: uploadData.publicUrl,
        thumbnailUrl,
        status: "active",
        createdAt: serverTimestamp(),
        duration,
        views: 0,
        likes: 0,
        isPremium: true,
        price,
        allowComments,
        isPublic: true,
        type: "video",
      }

      // A. Add to videos collection (global index)
      const videoRef = await addDoc(collection(db, "videos"), videoData)
      console.log(`Video saved to Firestore with ID: ${videoRef.id}`)

      // B. Add to user's videos collection
      await setDoc(doc(db, `users/${user.uid}/videos`, videoRef.id), {
        videoId: videoRef.id,
        title,
        thumbnailUrl,
        createdAt: serverTimestamp(),
        isPremium: true,
        price,
        url: uploadData.publicUrl,
      })
      console.log("Video reference added to user's videos collection")

      // C. Add to premiumClips collection
      await addDoc(collection(db, "premiumClips"), {
        ...videoData,
        videoId: videoRef.id,
      })
      console.log("Video added to premiumClips collection")

      // Show success message
      toast({
        title: "Success!",
        description: "Premium video uploaded successfully.",
        variant: "success",
      })

      // Redirect to profile
      router.push(`/creator/${creatorUsername}`)
    } catch (error) {
      console.error("Upload error:", error)
      setUploadError(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.")
      setIsUploading(false)
    }
  }

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview)
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
    }
  }, [filePreview, thumbnailPreview])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center">
          <Lock className="h-5 w-5 text-amber-500 mr-2" />
          <h2 className="text-xl font-semibold text-white">Upload Premium Content</h2>
        </div>

        <div className="p-1 border-b border-zinc-800 flex items-center text-sm text-zinc-400 px-6">
          <User className="h-3.5 w-3.5 mr-2" />
          <span>
            Uploading as <span className="text-amber-500">@{creatorUsername}</span>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Video File */}
          <div className="mb-6">
            <label className="block text-white mb-2">
              Video File <span className="text-red-500">*</span>
            </label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
                "hover:bg-zinc-800/30",
                selectedFile ? "border-amber-500/50 bg-amber-500/5" : "border-zinc-700 bg-zinc-800/30",
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
                  <p className="text-white">Click to upload premium video</p>
                  <p className="text-xs text-zinc-500 mt-1">MP4, MOV or WebM (Max 500MB)</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            </div>
            {selectedFile && (
              <div className="mt-2 text-sm flex justify-between">
                <span className="text-amber-400">
                  {selectedFile.name} ({formatDuration(duration)})
                </span>
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
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              placeholder="Enter a title for your premium video"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-white mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              placeholder="Describe your premium video"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              required
            />
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label htmlFor="tags" className="block text-white mb-2">
              Tags <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded-md flex items-center text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-amber-300 hover:text-amber-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4" />
                <input
                  id="tags"
                  type="text"
                  placeholder="Add tags (press Enter after each tag)"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 pl-10 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (currentTag.trim() && !tags.includes(currentTag.trim())) {
                    setTags([...tags, currentTag.trim()])
                    setCurrentTag("")
                  }
                }}
                className="ml-2 bg-amber-600 hover:bg-amber-700 text-white px-4 rounded-md"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Add relevant tags to help users discover your content</p>
          </div>

          {/* Price */}
          <div className="mb-6">
            <label htmlFor="price" className="block text-white mb-2">
              Price (USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4" />
              <input
                id="price"
                type="number"
                min="0.99"
                step="0.01"
                placeholder="5.99"
                value={price}
                onChange={(e) => setPrice(Number.parseFloat(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 pl-10 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">Set the price for this premium video</p>
          </div>

          {/* Custom Thumbnail */}
          <div className="mb-6">
            <label className="block text-white mb-2">Custom Thumbnail (Optional)</label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
                "hover:bg-zinc-800/30",
                thumbnailFile ? "border-amber-500/50 bg-amber-500/5" : "border-zinc-700 bg-zinc-800/30",
              )}
              onClick={() => thumbnailInputRef.current?.click()}
            >
              {thumbnailPreview ? (
                <div className="aspect-video relative rounded overflow-hidden bg-black">
                  <img
                    src={thumbnailPreview || "/placeholder.svg"}
                    className="w-full h-full object-cover"
                    alt="Thumbnail preview"
                  />
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center">
                  <ImageIcon className="h-8 w-8 text-zinc-500 mb-2" />
                  <p className="text-white">Click to upload thumbnail</p>
                  <p className="text-xs text-zinc-500 mt-1">JPG, PNG (Recommended: 16:9 ratio)</p>
                </div>
              )}
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleThumbnailChange}
              />
            </div>
            {thumbnailFile && (
              <div className="mt-2 text-sm flex justify-between">
                <span className="text-amber-400">{thumbnailFile.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setThumbnailFile(null)
                    setThumbnailPreview(null)
                    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ""
                  }}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Allow Comments */}
          <div className="mb-6">
            <div className="flex items-center">
              <input
                id="allowComments"
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="allowComments" className="ml-2 block text-white">
                Allow comments on this video
              </label>
            </div>
            <div className="flex items-center mt-1 text-xs text-zinc-500">
              <MessageSquare className="h-3 w-3 mr-1" />
              <span>Users will be able to leave comments on your premium video</span>
            </div>
          </div>

          {/* Error message */}
          {uploadError && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <X className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-200">{uploadError}</p>
            </div>
          )}

          {/* Upload progress */}
          {isUploading && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading premium content...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2.5">
                <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}

          {/* Submit button */}
          <div className="mt-6">
            <button
              type="submit"
              disabled={isUploading || !selectedFile || !title.trim() || tags.length === 0 || price <= 0}
              className={cn(
                "w-full py-3 rounded-md font-medium text-white transition-colors",
                "bg-amber-500 hover:bg-amber-600",
                (isUploading || !selectedFile || !title.trim() || tags.length === 0 || price <= 0) &&
                  "opacity-50 cursor-not-allowed",
              )}
            >
              {isUploading ? "Uploading..." : "Publish Premium Video"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
