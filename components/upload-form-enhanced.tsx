"use client"

import { useState, useRef, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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
import { Upload, Video, CheckCircle2, AlertCircle, Loader2, User, DollarSign, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

export default function UploadFormEnhanced() {
  const { user } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPremium, setIsPremium] = useState(false)
  const [price, setPrice] = useState("4.99")

  // Creator profile state
  const [creatorUsername, setCreatorUsername] = useState<string>("jus")
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
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

  // Format duration to MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Handle form submission (mockup)
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

    // Simulate upload
    setIsUploading(true)
    setUploadError(null)
    setUploadProgress(0)

    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setShowSuccessDialog(true)
          setIsUploading(false)
          return 100
        }
        return prev + 5
      })
    }, 200)
  }

  // Reset form after successful upload
  const resetForm = () => {
    setTitle("")
    setDescription("")
    setSelectedFile(null)
    setFilePreview(null)
    setDuration(0)
    setUploadProgress(0)
    setIsPremium(false)
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
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-zinc-500" />
                Uploading as <span className="text-red-400">@{creatorUsername}</span>
              </span>
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 bg-black">
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

                {/* Premium Toggle */}
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-amber-500" />
                      <Label htmlFor="premium-toggle" className="text-sm font-medium text-white cursor-pointer">
                        Premium Content
                      </Label>
                    </div>
                    <Switch
                      id="premium-toggle"
                      checked={isPremium}
                      onCheckedChange={setIsPremium}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>

                  {isPremium && (
                    <div className="mt-4 pt-4 border-t border-zinc-700/50">
                      <p className="text-xs text-zinc-400 mb-3">
                        This video will be available only to subscribers who pay for your premium content.
                      </p>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-300">
                          Individual video price is set in your profile settings
                        </span>
                      </div>
                    </div>
                  )}
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
                  disabled={isUploading || !selectedFile || !title.trim()}
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
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
