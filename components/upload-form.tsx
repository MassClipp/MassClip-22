"use client"

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
import { Upload, Video, CheckCircle2, AlertCircle, Loader2, User } from "lucide-react"
import { cn } from "@/lib/utils"

export default function UploadForm() {
  const { user } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  // Creator profile state
  const [creatorUsername, setCreatorUsername] = useState<string>("")
  const [creatorHandle, setCreatorHandle] = useState<string>("")
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  // Fetch the creator profile information
  useEffect(() => {
    async function fetchCreatorProfile() {
      if (!user) {
        setIsLoadingProfile(false)
        return
      }

      try {
        console.log("Fetching creator profile for UID:", user.uid)

        // First try to get the creator profile directly
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("uid", "==", user.uid))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data()
          console.log("Found creator profile:", userData)

          if (userData.username) {
            setCreatorUsername(userData.username)
            setCreatorHandle(userData.handle || userData.username)
            setIsLoadingProfile(false)
            return
          }
        }

        // If not found by UID, try to find by email
        if (user.email) {
          const emailQuery = query(usersRef, where("email", "==", user.email))
          const emailSnapshot = await getDocs(emailQuery)

          if (!emailSnapshot.empty) {
            const userData = emailSnapshot.docs[0].data()
            console.log("Found creator profile by email:", userData)

            if (userData.username) {
              setCreatorUsername(userData.username)
              setCreatorHandle(userData.handle || userData.username)
              setIsLoadingProfile(false)
              return
            }
          }
        }

        // As a last resort, check if there's a document with the user's UID as the ID
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          console.log("Found user document by ID:", userData)

          if (userData.username) {
            setCreatorUsername(userData.username)
            setCreatorHandle(userData.handle || userData.username)
          } else {
            console.error("No username found in user document")
            setUploadError("Your creator profile is missing a username. Please set up your profile first.")
          }
        } else {
          console.error("No creator profile found")
          setUploadError("No creator profile found. Please set up your profile first.")
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

  // Format duration to MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Get a signed upload URL from the server
  const getSignedUploadUrl = async (file: File) => {
    try {
      console.log("Requesting signed upload URL for file:", file.name)

      // Create a sanitized title for the filename
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()
      const timestamp = Date.now()

      // Format: {creatorUsername}/{title}-{timestamp}.mp4
      const fileName = `${creatorUsername}/${sanitizedTitle}-${timestamp}.${file.name.split(".").pop()}`

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

    try {
      setIsUploading(true)
      setUploadError(null)
      setUploadProgress(0)

      // Step 1: Get signed URL for video upload
      const uploadData = await getSignedUploadUrl(selectedFile)

      // Step 2: Upload video to R2
      await uploadFileToR2(selectedFile, uploadData.uploadUrl, (progress) => {
        setUploadProgress(progress)
      })

      setUploadProgress(100)

      // Step 3: Save video data to Firestore
      const videoData = {
        uid: user.uid,
        username: creatorUsername, // Use the creator profile username
        title,
        description: description || "",
        url: uploadData.publicUrl,
        status: "active",
        createdAt: serverTimestamp(),
        duration,
      }

      // Add to videos collection
      const videoRef = await addDoc(collection(db, "videos"), videoData)
      console.log(`Video saved to Firestore with ID: ${videoRef.id}`)

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
    setSelectedFile(null)
    setFilePreview(null)
    setDuration(0)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Navigate to profile after upload
  const goToProfile = () => {
    if (creatorUsername) {
      router.push(`/creator/${creatorUsername}`)
    } else {
      router.push("/dashboard")
    }
  }

  // Navigate to profile setup
  const goToProfileSetup = () => {
    router.push("/dashboard/profile/edit")
  }

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <Card className="bg-black border-zinc-800 text-white">
          <CardHeader className="bg-gradient-to-r from-red-500/10 to-red-600/10 border-b border-red-500/20">
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-red-500" />
              <span>Upload Content</span>
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {creatorUsername ? (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-zinc-500" />
                  Uploading as <span className="text-red-400">@{creatorHandle || creatorUsername}</span>
                </span>
              ) : (
                "Share your content with the world"
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 bg-black">
            {isLoadingProfile ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
                <span className="ml-3 text-zinc-400">Loading your creator profile...</span>
              </div>
            ) : !creatorUsername ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                <p className="text-amber-200 mb-2">Your creator profile is missing a username</p>
                <Button onClick={goToProfileSetup} className="bg-amber-500 hover:bg-amber-600 text-black">
                  Set Up Creator Profile
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* Video upload */}
                  <div>
                    <Label htmlFor="video-upload" className="block mb-2 text-sm font-medium text-white">
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
                          <p className="text-sm font-medium text-white">Click to upload video</p>
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

                  {/* Title */}
                  <div>
                    <Label htmlFor="title" className="block mb-2 text-sm font-medium text-white">
                      Title
                    </Label>
                    <Input
                      id="title"
                      placeholder="Enter a title for your video"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description" className="block mb-2 text-sm font-medium text-white">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your video"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="bg-zinc-800/50 border-zinc-700 focus:border-red-500 text-white resize-none"
                    />
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
                    disabled={isUploading || !selectedFile || !title.trim() || !creatorUsername}
                    className="w-full py-6 text-base font-medium bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-5 w-5" />
                        Publish Video
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            )}
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
              Your video has been uploaded successfully and is now available on your creator profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={resetForm} className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Upload Another
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={goToProfile}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              View My Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
