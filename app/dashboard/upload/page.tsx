"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Upload, FileVideo, AlertCircle, RefreshCw, X, Info, ChevronDown, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore"
import { useMobile } from "@/hooks/use-mobile"
import { assignVideoToCategory } from "@/app/actions/category-actions"
import { useShowcaseTags } from "@/hooks/use-showcase-tags"

// Import the new resumable upload function
import { resumableUploadToVimeo } from "@/lib/resumable-vimeo-upload"
import { directUploadToVimeo } from "@/lib/direct-vimeo-upload"

// Import the diagnostic component
import { UploadNetworkDiagnostic } from "@/components/upload-network-diagnostic"

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedNiche, setSelectedNiche] = useState<string>("")
  const [selectedTag, setSelectedTag] = useState<string>("")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState("public")
  const [isPremium, setIsPremium] = useState(false)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [uploadStage, setUploadStage] = useState<
    "idle" | "preparing" | "uploading" | "processing" | "complete" | "error" | "stalled"
  >("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const isMobile = useMobile()

  // Get the niche-to-tags mapping
  const { nicheTagsMap, isLoading: tagsLoading, niches } = useShowcaseTags()

  // Reset tag when niche changes
  useEffect(() => {
    setSelectedTag("")
  }, [selectedNiche])

  // Clean up object URL on unmount or when file changes
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }
    }
  }, [videoPreviewUrl])

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true)
    } else if (e.type === "dragleave") {
      setIsDragging(false)
    }
  }, [])

  // Create preview URL for video
  const createVideoPreview = useCallback(
    (file: File) => {
      // Clean up previous preview URL
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }

      // Create new preview URL
      const url = URL.createObjectURL(file)
      setVideoPreviewUrl(url)
    },
    [videoPreviewUrl],
  )

  // Handle drop event
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0]
        if (file.type.startsWith("video/")) {
          setSelectedFile(file)
          createVideoPreview(file)
          setTitle(file.name.replace(/\.[^/.]+$/, "")) // Set title to filename without extension
          toast({
            title: "File selected",
            description: `${file.name} has been selected for upload.`,
          })
        } else {
          toast({
            title: "Invalid file type",
            description: "Please upload a video file.",
            variant: "destructive",
          })
        }
      }
    },
    [toast, createVideoPreview],
  )

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
        if (file.type.startsWith("video/")) {
          setSelectedFile(file)
          createVideoPreview(file)
          setTitle(file.name.replace(/\.[^/.]+$/, "")) // Set title to filename without extension
          toast({
            title: "File selected",
            description: `${file.name} has been selected for upload.`,
          })
        } else {
          toast({
            title: "Invalid file type",
            description: "Please upload a video file.",
            variant: "destructive",
          })
        }
      }
    },
    [toast, createVideoPreview],
  )

  // Validate form
  const validateForm = useCallback(() => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a video file to upload.",
        variant: "destructive",
      })
      return false
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please add a title for your content.",
        variant: "destructive",
      })
      return false
    }

    if (!selectedNiche) {
      toast({
        title: "Niche required",
        description: "Please select a niche for your content.",
        variant: "destructive",
      })
      return false
    }

    if (!selectedTag) {
      toast({
        title: "Tag required",
        description: "Please select a tag for your content.",
        variant: "destructive",
      })
      return false
    }

    return true
  }, [selectedFile, title, selectedNiche, selectedTag, toast])

  // Handle browse files click
  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  // Upload function
  const handleUpload = useCallback(async () => {
    if (!validateForm()) return
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload content.",
        variant: "destructive",
      })
      return
    }

    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStage("preparing")
    setErrorMessage(null)

    try {
      // Step 1: Create a document in Firestore to track the upload
      const uploadData = {
        title: title || selectedFile.name,
        description,
        niche: selectedNiche,
        tag: selectedTag,
        visibility,
        isPremium,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        createdAt: serverTimestamp(),
        userId: user.uid,
        status: "preparing",
        vimeoId: null,
        vimeoLink: null,
      }

      const docRef = await addDoc(collection(db, "uploads"), uploadData)
      const uploadId = docRef.id

      // Also save to user's uploads collection
      await addDoc(collection(db, `users/${user.uid}/uploads`), {
        ...uploadData,
        uploadId: uploadId,
      })

      // Step 2: Initialize the Vimeo upload using the direct upload approach
      const formData = new FormData()
      formData.append("name", title || selectedFile.name)
      formData.append("description", description || "")
      formData.append("size", selectedFile.size.toString())
      formData.append("privacy", visibility === "private" ? "nobody" : "anybody")
      formData.append("userId", user.uid)
      formData.append("niche", selectedNiche)
      formData.append("tag", selectedTag)

      // Add upload method to form data for server-side logging
      formData.append("uploadMethod", "resumable")

      console.log("Initializing upload with Vimeo API...")
      const initResponse = await fetch("/api/vimeo/direct-upload", {
        method: "POST",
        body: formData,
      })

      if (!initResponse.ok) {
        const errorData = await initResponse.json()
        console.error("Vimeo API initialization error:", errorData)
        throw new Error(errorData.details || "Failed to initialize upload")
      }

      const vimeoData = await initResponse.json()
      console.log("Vimeo upload initialized:", vimeoData)

      if (!vimeoData.uploadUrl) {
        throw new Error("No upload URL received from Vimeo")
      }

      // Update Firestore with Vimeo ID
      await updateDoc(doc(db, "uploads", uploadId), {
        vimeoId: vimeoData.vimeoId,
        vimeoLink: vimeoData.link,
        status: "uploading",
      })

      // Step 3: Upload the file
      setUploadStage("uploading")

      // Add a small delay to ensure the UI updates before starting the upload
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Try the resumable upload first
      try {
        console.log("Starting resumable upload...")
        await resumableUploadToVimeo({
          file: selectedFile,
          uploadUrl: vimeoData.uploadUrl,
          onProgress: (progress) => {
            setUploadProgress(progress)
          },
          onError: (error) => {
            console.error("Resumable upload error:", error)
            throw error
          },
          onStalled: () => {
            console.log("Upload stalled, UI will show warning")
            setUploadStage("stalled")
            // The upload will try to auto-resume
          },
        })
      } catch (resumableError) {
        console.error("Resumable upload failed, falling back to direct upload:", resumableError)

        // If resumable upload fails, try direct upload as fallback
        toast({
          title: "Resumable upload failed",
          description: "Trying alternative upload method...",
          variant: "warning",
        })

        // Reset progress for the fallback method
        setUploadProgress(0)

        await directUploadToVimeo({
          file: selectedFile,
          uploadUrl: vimeoData.uploadUrl,
          onProgress: (progress) => {
            setUploadProgress(progress)
          },
          onError: (error) => {
            throw error
          },
          onStalled: () => {
            console.log("Direct upload stalled, UI will show warning")
            setUploadStage("stalled")
          },
        })
      }

      // Update status in Firestore
      await updateDoc(doc(db, "uploads", uploadId), {
        status: "processing",
        uploadedAt: serverTimestamp(),
      })

      // Assign the video to the appropriate category
      try {
        const result = await assignVideoToCategory(uploadId, selectedNiche, selectedTag, user.uid)
        if (!result.success) {
          console.warn("Failed to assign video to category:", result.error)
        }
      } catch (error) {
        console.error("Error assigning category:", error)
        // Don't fail the upload if category assignment fails
      }

      setUploadStage("processing")
      setUploadProgress(100)

      toast({
        title: "Upload complete",
        description: "Your video has been uploaded and is now processing.",
      })

      // Redirect to uploads page
      router.push("/dashboard/uploads")
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStage("error")
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload video")

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "There was an error uploading your video",
        variant: "destructive",
      })

      setIsUploading(false)
    }
  }, [
    selectedFile,
    title,
    description,
    selectedNiche,
    selectedTag,
    visibility,
    isPremium,
    validateForm,
    user,
    toast,
    router,
  ])

  // Get upload stage text
  const getUploadStageText = useCallback(() => {
    switch (uploadStage) {
      case "preparing":
        return "Preparing upload..."
      case "uploading":
        return `Uploading ${selectedFile?.name} (${uploadProgress.toFixed(0)}%)`
      case "stalled":
        return "Upload stalled. Attempting to resume..."
      case "processing":
        return "Processing video on Vimeo..."
      case "complete":
        return "Upload complete!"
      case "error":
        return "Upload failed"
      default:
        return ""
    }
  }, [uploadStage, selectedFile, uploadProgress])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-4">
            {selectedFile && !isUploading && (
              <Button
                onClick={handleUpload}
                className="bg-gradient-to-r from-crimson to-crimson-dark text-white hover:from-crimson-dark hover:to-crimson transition-all duration-300 shadow-lg shadow-crimson/20 hover:shadow-crimson/30"
              >
                Upload Now
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Upload Content</h1>
          <p className="text-zinc-400 mb-8 md:mb-12">Share your premium content with your audience</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Main Upload Area */}
          <div className="lg:col-span-3 space-y-8">
            {/* Upload Zone */}
            <div
              className={`
                relative rounded-xl overflow-hidden transition-all duration-300
                ${selectedFile ? "bg-zinc-900/50 border border-zinc-800" : "bg-gradient-to-b from-zinc-900/50 to-black border border-zinc-800 hover:border-zinc-700"}
                ${isDragging ? "border-crimson/50 shadow-lg shadow-crimson/10 scale-[1.01]" : ""}
                ${uploadStage === "error" ? "border-red-500/50" : ""}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {isUploading ? (
                <div className="p-8 md:p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    {uploadStage === "error" ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                          <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <p className="text-lg font-medium mb-2 text-red-500">Upload Failed</p>
                        <p className="text-sm text-zinc-400 mb-4">{errorMessage}</p>
                        <Button onClick={() => setIsUploading(false)} variant="outline" className="mt-2">
                          Try Again
                        </Button>
                      </>
                    ) : (
                      <>
                        <Progress value={uploadProgress} className="w-full h-2 mb-4" />
                        <p className="text-sm font-medium mb-1">{getUploadStageText()}</p>
                        <p className="text-xs text-zinc-400">
                          {uploadStage === "processing"
                            ? "This may take several minutes depending on the file size"
                            : uploadStage === "uploading"
                              ? `${uploadProgress.toFixed(0)}% complete`
                              : ""}
                        </p>
                        {uploadProgress === 0 && uploadStage === "uploading" && (
                          <div className="flex items-center justify-center mt-2">
                            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                            <span className="text-xs text-zinc-400">Starting upload...</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : selectedFile ? (
                <div className="p-8 md:p-12">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <FileVideo className="w-8 h-8 md:w-10 md:h-10 text-zinc-400" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <p className="font-medium text-lg md:text-xl mb-1 break-all">{selectedFile.name}</p>
                      <p className="text-sm text-zinc-400 mb-4">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null)
                          setVideoPreviewUrl(null)
                        }}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove file
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 md:p-12 lg:p-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-900 flex items-center justify-center mb-6">
                      <Upload className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-medium mb-2">Drag & drop your video</h3>
                    <p className="text-zinc-400 text-sm mb-6 max-w-md">Upload MP4, MOV or WebM files up to 500MB</p>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      id="file-upload"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                    <Button
                      onClick={handleBrowseClick}
                      variant="outline"
                      className="bg-white text-black hover:bg-zinc-200 border-0"
                    >
                      Select File
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 md:p-8">
              <h3 className="text-lg font-medium mb-6">Basic Information</h3>

              <div className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-zinc-400 mb-2">
                    Title <span className="text-crimson">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Add a title that describes your content"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-zinc-400 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your content to your audience"
                    rows={4}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent transition-all resize-none"
                  ></textarea>
                </div>

                {/* Niche Selection */}
                <div>
                  <label htmlFor="niche" className="block text-sm font-medium text-zinc-400 mb-2">
                    Niche <span className="text-crimson">*</span>
                  </label>
                  <select
                    id="niche"
                    value={selectedNiche}
                    onChange={(e) => setSelectedNiche(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent transition-all appearance-none"
                  >
                    <option value="">Select a niche</option>
                    {niches.map((niche) => (
                      <option key={niche} value={niche}>
                        {niche}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-2">Select the primary category for your content</p>
                </div>

                {/* Tag Selection (dependent on niche) */}
                <div>
                  <label htmlFor="tag" className="block text-sm font-medium text-zinc-400 mb-2">
                    Tag <span className="text-crimson">*</span>
                  </label>
                  <select
                    id="tag"
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    disabled={!selectedNiche || tagsLoading}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {tagsLoading ? "Loading tags..." : !selectedNiche ? "Select a niche first" : "Select a tag"}
                    </option>
                    {selectedNiche &&
                      nicheTagsMap[selectedNiche]?.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-2">
                    {selectedNiche
                      ? "Select a specific tag within this niche"
                      : "First select a niche to see available tags"}
                  </p>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-6 md:p-8 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Info className="w-4 h-4 text-zinc-400" />
                  </div>
                  <span className="font-medium">Advanced Settings</span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${showAdvanced ? "rotate-180" : ""}`}
                />
              </button>

              {showAdvanced && (
                <div className="p-6 md:p-8 pt-0 border-t border-zinc-800">
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="visibility" className="block text-sm font-medium text-zinc-400 mb-2">
                        Visibility
                      </label>
                      <select
                        id="visibility"
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent transition-all appearance-none"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="unlisted">Unlisted</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="premium"
                        checked={isPremium}
                        onChange={(e) => setIsPremium(e.target.checked)}
                        className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-crimson focus:ring-crimson/50"
                      />
                      <label htmlFor="premium" className="ml-2 text-sm text-zinc-300">
                        Mark as premium content (subscribers only)
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-8">
            {/* Preview */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">Preview</h3>
                <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden flex items-center justify-center mb-4 mx-auto max-w-[240px]">
                  {videoPreviewUrl ? (
                    <video
                      src={videoPreviewUrl}
                      className="w-full h-full object-contain"
                      controls
                      controlsList="nodownload"
                    />
                  ) : selectedFile ? (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <FileVideo className="w-12 h-12 text-zinc-700" />
                    </div>
                  ) : (
                    <div className="text-center p-6">
                      <FileVideo className="w-12 h-12 text-zinc-800 mx-auto mb-2" />
                      <p className="text-xs text-zinc-600">No file selected</p>
                    </div>
                  )}
                </div>
                {selectedFile && (
                  <div className="text-sm text-zinc-400">
                    <p className="mb-1">
                      <span className="text-zinc-500">Format:</span> {selectedFile.type.split("/")[1].toUpperCase()}
                    </p>
                    <p>
                      <span className="text-zinc-500">Size:</span> {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Guidelines */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4">Upload Guidelines</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-crimson" />
                  </div>
                  <span className="text-zinc-300">
                    Maximum file size: <span className="text-white">500MB</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-crimson" />
                  </div>
                  <span className="text-zinc-300">
                    Supported formats: <span className="text-white">MP4, MOV, WebM</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-crimson" />
                  </div>
                  <span className="text-zinc-300">
                    Recommended resolution: <span className="text-white">1080p or higher</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-crimson" />
                  </div>
                  <span className="text-zinc-300">You must own the rights to the content you upload</span>
                </li>
              </ul>
            </div>

            {/* Mobile Optimization */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4">Mobile Optimization</h3>
              <p className="text-sm text-zinc-400 mb-4">Optimize your content for mobile viewing with these tips:</p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-crimson" />
                  </div>
                  <span className="text-zinc-300">Vertical format (9:16) is ideal for mobile platforms</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-crimson" />
                  </div>
                  <span className="text-zinc-300">Keep text large and readable on small screens</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-crimson" />
                  </div>
                  <span className="text-zinc-300">Use high contrast visuals for better visibility</span>
                </li>
              </ul>
            </div>

            <UploadNetworkDiagnostic />
          </div>
        </div>
      </main>

      {/* Fixed Bottom Bar (Mobile Only) */}
      {isMobile && selectedFile && !isUploading && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-zinc-800 p-4 z-50">
          <Button
            onClick={handleUpload}
            className="w-full bg-gradient-to-r from-crimson to-crimson-dark text-white hover:from-crimson-dark hover:to-crimson transition-all duration-300 shadow-lg shadow-crimson/20 hover:shadow-crimson/30"
          >
            Upload Now
          </Button>
        </div>
      )}
    </div>
  )
}
