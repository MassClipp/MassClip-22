"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Upload, X, Video, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

// Maximum file size in bytes (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024

// Allowed file types
const ALLOWED_FILE_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"]

export default function VideoUploadForm({ onComplete, defaultIsPremium = false }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPremium, setIsPremium] = useState(defaultIsPremium)
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("idle") // idle, preparing, uploading, processing, complete
  const fileInputRef = useRef(null)
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (file) => {
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError(`Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`)
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`)
      return
    }

    setSelectedFile(file)
    setError(null)
  }

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const uploadFileDirectly = async (file, uploadUrl) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", uploadUrl)
      xhr.setRequestHeader("Content-Type", file.type)

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setProgress(percentComplete)
        }
      })

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }

      xhr.onerror = () => {
        reject(new Error("Network error during upload"))
      }

      xhr.send(file)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user) {
      setError("You must be logged in to upload videos")
      return
    }

    if (!title.trim()) {
      setError("Please enter a title for your video")
      return
    }

    if (!selectedFile) {
      setError("Please select a video file to upload")
      return
    }

    try {
      setIsUploading(true)
      setProgress(0)
      setError(null)
      setCurrentStep("preparing")

      // Step 1: Get upload URL
      const formData = new FormData()
      formData.append("filename", selectedFile.name)
      formData.append("contentType", selectedFile.type)
      formData.append("isPremium", String(isPremium))

      const urlResponse = await fetch("/api/videos/get-upload-url", {
        method: "POST",
        body: formData,
      })

      if (!urlResponse.ok) {
        const errorData = await urlResponse.json()
        throw new Error(errorData.error || "Failed to get upload URL")
      }

      const { uploadUrl, publicUrl, storagePath, fileId } = await urlResponse.json()

      // Step 2: Upload file directly
      setCurrentStep("uploading")
      setProgress(0)
      await uploadFileDirectly(selectedFile, uploadUrl)

      // Step 3: Register the upload
      setCurrentStep("processing")
      setProgress(90)

      const registerResponse = await fetch("/api/videos/register-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          storagePath,
          publicUrl,
          title,
          description: description || "",
          isPremium,
        }),
      })

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json()
        throw new Error(errorData.error || "Failed to register upload")
      }

      setCurrentStep("complete")
      setProgress(100)

      toast({
        title: "Upload Complete",
        description: `Your ${isPremium ? "premium" : "free"} video has been uploaded successfully.`,
      })

      // Redirect to the user's public profile
      if (user?.username) {
        router.push(`/creator/${user.username}?tab=${isPremium ? "premium" : "free"}`)
      } else {
        // If no username, just stay on the current page
        if (onComplete) {
          onComplete()
        }
      }
    } catch (error) {
      console.error("Upload error:", error)
      setError(error.message || "An unknown error occurred")
      setCurrentStep("idle")
      toast({
        title: "Upload Failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const getStepText = () => {
    switch (currentStep) {
      case "preparing":
        return "Preparing upload..."
      case "uploading":
        return "Uploading video..."
      case "processing":
        return "Processing video..."
      case "complete":
        return "Upload complete!"
      default:
        return "Uploading..."
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-2">Upload New Video</h1>
        <p className="text-zinc-400">Share your content with your audience</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive ? "border-red-500 bg-red-500/5" : "border-zinc-700 hover:border-red-500/50"
          } ${selectedFile ? "bg-zinc-800/30" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Video className="h-10 w-10 text-red-500" />
              </div>
              <div>
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-zinc-400 text-sm">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedFile(null)}
                className="text-zinc-400 border-zinc-700"
                disabled={isUploading}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Upload className="h-10 w-10 text-zinc-500" />
              </div>
              <div>
                <p className="text-white font-medium">Drag and drop your video here</p>
                <p className="text-zinc-400 text-sm">
                  or click to browse (MP4, MOV, WebM, up to {MAX_FILE_SIZE / (1024 * 1024)}MB)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              >
                Select File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_FILE_TYPES.join(",")}
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-white">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your video"
              className="bg-zinc-800/50 border-zinc-700 text-white"
              required
              disabled={isUploading}
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white">
              Description <span className="text-zinc-400">(optional)</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for your video"
              className="bg-zinc-800/50 border-zinc-700 text-white h-24"
              disabled={isUploading}
            />
          </div>
        </div>

        {/* Premium Toggle */}
        <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg border border-zinc-800">
          <div>
            <h3 className="text-white font-medium">Premium Content</h3>
            <p className="text-zinc-400 text-sm">
              {isPremium
                ? "This video will only be available to paying subscribers"
                : "This video will be available to everyone for free"}
            </p>
          </div>
          <Switch
            checked={isPremium}
            onCheckedChange={setIsPremium}
            className="data-[state=checked]:bg-red-500"
            disabled={isUploading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-md">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{getStepText()}</span>
              <span className="text-white">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-zinc-800" />
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => (onComplete ? onComplete() : router.back())}
            className="border-zinc-700 text-white"
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-red-500 hover:bg-red-600 text-white"
            disabled={isUploading || !selectedFile || !title.trim()}
          >
            {isUploading ? "Uploading..." : "Upload Video"}
          </Button>
        </div>
      </form>
    </div>
  )
}
