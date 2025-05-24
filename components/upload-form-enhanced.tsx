"use client"

import { useState, useRef, type ChangeEvent, type FormEvent, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
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
import { Upload, Video, CheckCircle2, AlertCircle, Loader2, User, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"

export default function UploadFormEnhanced() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if premium is set in URL
  const isPremiumParam = searchParams.get("premium") === "true"

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPremium, setIsPremium] = useState(isPremiumParam)
  const [price, setPrice] = useState("4.99")

  // Creator profile state
  const [creatorUsername, setCreatorUsername] = useState<string>("")
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [stripeConnected, setStripeConnected] = useState(false)

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null)

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return

      try {
        setIsLoadingProfile(true)
        const userDoc = await getDoc(doc(db, "users", user.uid))

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setCreatorUsername(userData.username || "")
          setStripeConnected(!!userData.stripeAccountId && userData.stripeOnboardingComplete)

          if (userData.premiumPrice) {
            setPrice(userData.premiumPrice.toString())
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchUserProfile()
  }, [user])

  // Handle video file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (500MB limit)
    if (file.size > 500 * 1024 * 1024) {
      setUploadError("File size exceeds 500MB limit")
      return
    }

    setSelectedFile(file)
    setUploadError(null)

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

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Validation
    if (!selectedFile) {
      setUploadError("Please select a video file to upload")
      return
    }

    if (!title.trim()) {
      setUploadError("Please enter a title for your video")
      return
    }

    // Check if premium content requires Stripe connection
    if (isPremium && !stripeConnected) {
      toast({
        title: "Stripe Account Required",
        description: "You need to connect your Stripe account to upload premium content.",
        variant: "destructive",
      })
      router.push("/dashboard/earnings")
      return
    }

    // Start upload
    setIsUploading(true)
    setUploadError(null)
    setUploadProgress(0)

    try {
      // Simulate file upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(uploadInterval)
            return 90
          }
          return prev + 5
        })
      }, 200)

      // In a real app, you'd upload the file to storage and get a URL
      // For this demo, we'll use the file preview URL as the video URL
      const videoUrl = filePreview || ""

      // Generate a placeholder thumbnail URL (in a real app, you'd generate this from the video)
      const thumbnailUrl = `/placeholder.svg?height=720&width=1280&query=${encodeURIComponent(title)}`

      // Create a video document in Firestore
      const videoData = {
        title,
        description,
        type: isPremium ? "premium" : "free",
        status: "active",
        uid: user?.uid,
        username: creatorUsername, // Add username field
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        views: 0,
        thumbnailUrl,
        videoUrl, // Use the file preview URL for demo purposes
        duration,
      }

      console.log("Creating video document with data:", videoData)

      // Add the document to Firestore
      const docRef = await addDoc(collection(db, "videos"), videoData)
      console.log("Video document created with ID:", docRef.id)

      setUploadedVideoId(docRef.id)

      // Complete the upload
      clearInterval(uploadInterval)
      setUploadProgress(100)
      setIsUploading(false)
      setShowSuccessDialog(true)
    } catch (error) {
      console.error("Error uploading video:", error)
      setUploadError("Failed to upload video. Please try again.")
      setIsUploading(false)
      setUploadProgress(0)
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
    setIsPremium(isPremiumParam)
    setUploadedVideoId(null)
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

  // Go to dashboard
  const goToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
          <CardHeader
            className={cn(
              "border-b border-zinc-800/50",
              isPremium
                ? "bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-500/20"
                : "bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/20",
            )}
          >
            <CardTitle className="flex items-center gap-2">
              <Video className={cn("h-5 w-5", isPremium ? "text-amber-500" : "text-red-500")} />
              <span>Upload {isPremium ? "Premium" : "Free"} Content</span>
            </CardTitle>
            <CardDescription className="text-zinc-400">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-zinc-500" />
                Uploading as{" "}
                <span className={isPremium ? "text-amber-400" : "text-red-400"}>@{creatorUsername || "creator"}</span>
              </span>
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Content Type Toggle */}
                <div className="flex justify-center space-x-2 w-full">
                  <Button
                    type="button"
                    onClick={() => setIsPremium(false)}
                    className={cn(
                      "py-2 px-4 rounded-l-md flex-1 flex items-center justify-center gap-2 transition-colors",
                      !isPremium
                        ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700",
                    )}
                  >
                    <span>Free Content</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsPremium(true)}
                    className={cn(
                      "py-2 px-4 rounded-r-md flex-1 flex items-center justify-center gap-2 transition-colors",
                      isPremium
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700",
                    )}
                  >
                    <Lock className="h-4 w-4" />
                    <span>Premium Content</span>
                  </Button>
                </div>

                {/* Premium Info */}
                {isPremium && (
                  <div className="bg-zinc-800/30 border border-amber-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-medium text-white">Premium Content</h3>
                    </div>
                    <p className="text-sm text-zinc-400 mt-2">
                      This video will be available only to subscribers who pay for your premium content.
                      {stripeConnected ? (
                        <span className="block mt-1 text-green-400">
                          Your Stripe account is connected and ready to receive payments.
                        </span>
                      ) : (
                        <span className="block mt-1 text-amber-400">
                          You need to connect your Stripe account to receive payments.
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto text-amber-400 underline"
                            onClick={() => router.push("/dashboard/earnings")}
                          >
                            Set up payments
                          </Button>
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Video upload */}
                <div>
                  <Label htmlFor="video-upload" className="block mb-2 text-sm font-medium text-white">
                    Video File
                  </Label>
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
                      "hover:bg-zinc-800/30 hover:border-zinc-700",
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
                  disabled={isUploading || !selectedFile || !title.trim() || (isPremium && !stripeConnected)}
                  className={cn(
                    "w-full py-6 text-base font-medium text-white",
                    isPremium
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                      : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
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
                      Publish {isPremium ? "Premium" : "Free"} Video
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
              Your {isPremium ? "premium" : "free"} video has been uploaded successfully and is now available on your
              creator profile.
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
            <AlertDialogAction
              onClick={goToDashboard}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            >
              Go to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
