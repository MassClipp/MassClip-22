"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Upload,
  FileVideo,
  X,
  Check,
  Tag,
  Info,
  ChevronDown,
  Trash2,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore"
import { uploadToVimeo } from "@/lib/vimeo-upload"

// Define the Vimeo data interface
interface VimeoUploadData {
  uploadUrl: string
  vimeoId: string
  uploadId: string
  link?: string
}

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(isUploading)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [visibility, setVisibility] = useState("public")
  const [isPremium, setIsPremium] = useState(false)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [uploadStage, setUploadStage] = useState<
    "idle" | "preparing" | "uploading" | "stalled" | "processing" | "complete" | "error"
  >("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadAttempts, setUploadAttempts] = useState(0)
  const [vimeoData, setVimeoData] = useState<VimeoUploadData | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const isMobile = useMobile()
  const { user } = useAuth()
  const router = useRouter()

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

  // Handle tag input
  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && tagInput.trim() !== "") {
        e.preventDefault()
        if (!tags.includes(tagInput.trim())) {
          setTags([...tags, tagInput.trim()])
          setTagInput("")
        }
      }
    },
    [tagInput, tags],
  )

  // Add tag button handler
  const handleAddTag = useCallback(() => {
    if (tagInput.trim() !== "" && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }, [tagInput, tags])

  // Remove tag
  const removeTag = useCallback(
    (tagToRemove: string) => {
      setTags(tags.filter((tag) => tag !== tagToRemove))
    },
    [tags],
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

    return true
  }, [selectedFile, title, toast])

  // Check Vimeo connection
  const checkVimeoConnection = useCallback(async () => {
    try {
      const response = await fetch("/api/vimeo/test-connection")
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to connect to Vimeo")
      }

      toast({
        title: "Vimeo connection successful",
        description: "Your Vimeo integration is working properly.",
      })

      return true
    } catch (error) {
      console.error("Vimeo connection test failed:", error)

      toast({
        title: "Vimeo connection failed",
        description: error instanceof Error ? error.message : "Could not connect to Vimeo",
        variant: "destructive",
      })

      return false
    }
  }, [toast])

  // Start the actual file upload to Vimeo
  const startFileUpload = useCallback(async () => {
    if (!selectedFile) {
      const error = "No file selected for upload"
      setErrorMessage(error)
      setUploadStage("error")
      return
    }

    // Add detailed debug info about the vimeoData
    const debugData = {
      vimeoDataExists: !!vimeoData,
      uploadUrlExists: !!vimeoData?.uploadUrl,
      vimeoId: vimeoData?.vimeoId || "missing",
      uploadId: vimeoData?.uploadId || "missing",
      fileInfo: selectedFile
        ? {
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
          }
        : "no file",
    }

    setDebugInfo(JSON.stringify(debugData, null, 2))

    if (!vimeoData) {
      const error = "Missing Vimeo upload data. Please try again."
      setErrorMessage(error)
      setUploadStage("error")
      return
    }

    if (!vimeoData.uploadUrl) {
      const error = "Missing Vimeo upload URL. Please try again."
      setErrorMessage(error)
      setUploadStage("error")
      return
    }

    try {
      setUploadStage("uploading")
      setUploadAttempts((prev) => prev + 1)

      console.log("Starting file upload with:", {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        uploadUrl: vimeoData.uploadUrl,
      })

      await uploadToVimeo({
        file: selectedFile,
        uploadUrl: vimeoData.uploadUrl,
        onProgress: (progress) => {
          setUploadProgress(progress)
        },
        onStalled: () => {
          setUploadStage("stalled")
          toast({
            title: "Upload stalled",
            description: "Upload appears to be stalled. Attempting to resume...",
          })
        },
        onError: (error) => {
          throw error
        },
      })

      // File is uploaded, now it's processing on Vimeo
      setUploadStage("processing")
      setUploadProgress(100)

      // Update status in Firestore
      await updateDoc(doc(db, "uploads", vimeoData.uploadId), {
        status: "processing",
        uploadedAt: serverTimestamp(),
      })

      // Show success message
      toast({
        title: "Upload complete",
        description: "Your video has been uploaded and is now processing. This may take some time.",
      })

      // Redirect to uploads page
      router.push("/dashboard/uploads")
    } catch (error) {
      console.error("File upload error:", error)
      setUploadStage("error")
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload file to Vimeo")

      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      })
    }
  }, [selectedFile, vimeoData, toast, router])

  // Initialize the Vimeo upload
  const initializeVimeoUpload = useCallback(async () => {
    if (!user || !selectedFile) {
      return null
    }

    try {
      // Create form data for the API request
      const formData = new FormData()
      formData.append("name", title)
      formData.append("description", description || "")
      formData.append("privacy", visibility === "private" ? "nobody" : "anybody")
      formData.append("userId", user.uid)
      formData.append("size", selectedFile.size.toString())

      console.log("Initializing Vimeo upload with size:", selectedFile.size)

      const initResponse = await fetch("/api/vimeo/upload", {
        method: "POST",
        body: formData,
      })

      const data = await initResponse.json()
      console.log("Vimeo initialization response:", data)

      if (!initResponse.ok) {
        throw new Error(
          data.details ||
            `Failed to initialize Vimeo upload (${initResponse.status}). Please try again later or contact support.`,
        )
      }

      if (!data.uploadUrl) {
        console.error("Missing uploadUrl in response:", data)
        setDebugInfo(JSON.stringify(data, null, 2))
        throw new Error("Invalid response from Vimeo. Missing upload URL.")
      }

      if (!data.vimeoId) {
        console.error("Missing vimeoId in response:", data)
        setDebugInfo(JSON.stringify(data, null, 2))
        throw new Error("Invalid response from Vimeo. Missing video ID.")
      }

      console.log("Vimeo upload initialized successfully. Upload URL:", data.uploadUrl)

      return data
    } catch (error) {
      console.error("Failed to initialize Vimeo upload:", error)
      throw error
    }
  }, [title, description, visibility, user, selectedFile])

  // Upload function that uploads to Vimeo
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

    // Reset any previous errors
    setErrorMessage(null)
    setDebugInfo(null)
    setIsUploading(true)
    setUploadProgress(0)
    setUploadStage("preparing")
    setVimeoData(null)

    try {
      // First, check Vimeo connection
      const connectionOk = await checkVimeoConnection()
      if (!connectionOk) {
        throw new Error("Could not connect to Vimeo. Please try again later or contact support.")
      }

      // Step 1: Create a document in Firestore to track the upload
      const uploadData = {
        title,
        description,
        tags,
        category: category || "uncategorized",
        visibility,
        isPremium,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        createdAt: serverTimestamp(),
        userId: user.uid,
        status: "preparing", // Initial status
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

      // Step 2: Initialize the Vimeo upload
      const vimeoUploadData = await initializeVimeoUpload()

      if (!vimeoUploadData) {
        throw new Error("Failed to initialize Vimeo upload")
      }

      if (!vimeoUploadData.uploadUrl) {
        setDebugInfo(JSON.stringify(vimeoUploadData, null, 2))
        throw new Error("Missing upload URL in Vimeo response")
      }

      // Update Firestore with Vimeo ID
      await updateDoc(doc(db, "uploads", uploadId), {
        vimeoId: vimeoUploadData.vimeoId,
        vimeoLink: vimeoUploadData.link,
        status: "uploading",
      })

      // Store the upload data for potential retries
      const completeVimeoData = {
        ...vimeoUploadData,
        uploadId,
      }

      setVimeoData(completeVimeoData)
      console.log("Setting vimeoData:", completeVimeoData)

      // Step 3: Upload the file to Vimeo using TUS protocol
      await startFileUpload()
    } catch (error) {
      console.error("Upload error:", error)
      setIsUploading(false)
      setUploadStage("error")
      const errorMsg = error instanceof Error ? error.message : "There was an error uploading your content."
      setErrorMessage(errorMsg)
      toast({
        title: "Upload failed",
        description: errorMsg,
        variant: "destructive",
      })
    }
  }, [
    selectedFile,
    title,
    description,
    tags,
    category,
    visibility,
    isPremium,
    validateForm,
    user,
    toast,
    checkVimeoConnection,
    initializeVimeoUpload,
    startFileUpload,
  ])

  // Retry the upload
  const retryUpload = useCallback(() => {
    if (vimeoData && selectedFile) {
      startFileUpload()
    } else {
      // If we don't have the Vimeo data anymore, start from scratch
      handleUpload()
    }
  }, [vimeoData, selectedFile, startFileUpload, handleUpload])

  // Handle browse files click
  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

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

  // Reset the upload state
  const resetUpload = useCallback(() => {
    setUploadStage("idle")
    setErrorMessage(null)
    setDebugInfo(null)
    setIsUploading(false)
    setUploadProgress(0)
    setVimeoData(null)
    setUploadAttempts(0)
  }, [])

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
                ${uploadStage === "stalled" ? "border-yellow-500/50" : ""}
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

                        {debugInfo && (
                          <div className="mb-4 w-full">
                            <p className="text-xs text-zinc-500 mb-1">Debug Information:</p>
                            <pre className="text-xs text-left bg-zinc-900 p-2 rounded-md overflow-auto max-h-32">
                              {debugInfo}
                            </pre>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <Button onClick={retryUpload} variant="default" className="mt-2">
                            Try Again
                          </Button>
                          <Button onClick={resetUpload} variant="outline" className="mt-2">
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : uploadStage === "stalled" ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                          <RefreshCw className="w-6 h-6 text-yellow-500 animate-spin" />
                        </div>
                        <p className="text-lg font-medium mb-2 text-yellow-500">Upload Stalled</p>
                        <p className="text-sm text-zinc-400 mb-4">
                          The upload appears to be stalled. Attempting to resume automatically...
                        </p>
                        <Progress value={uploadProgress} className="w-full h-2 mb-4" />
                        <div className="flex gap-3">
                          <Button onClick={retryUpload} variant="default" className="mt-2">
                            Retry Upload
                          </Button>
                          <Button onClick={resetUpload} variant="outline" className="mt-2">
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Progress value={uploadProgress} className="w-full h-2 mb-4" />
                        <p className="text-sm font-medium mb-1" className="w-full h-2 mb-4" />
                        <p className="text-sm font-medium mb-1">{getUploadStageText()}</p>
                        <p className="text-xs text-zinc-400">
                          {uploadStage === "processing"
                            ? "This may take several minutes depending on the file size"
                            : uploadStage === "uploading"
                              ? `${uploadProgress.toFixed(0)}% complete`
                              : ""}
                        </p>
                        {uploadProgress === 0 && uploadStage === "uploading" && uploadAttempts > 1 && (
                          <p className="text-xs text-yellow-400 mt-2">
                            Upload is initializing. This may take a moment for large files...
                          </p>
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
                        <Trash2 className="w-4 h-4 mr-2" />
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

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-zinc-800 text-white text-xs px-3 py-1.5 rounded-full"
                      >
                        #{tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-zinc-700 transition-colors"
                        >
                          <X className="w-3 h-3" />
                          <span className="sr-only">Remove {tag}</span>
                        </button>
                      </span>
                    ))}
                    {tags.length === 0 && <span className="text-xs text-zinc-500 italic">No tags added yet</span>}
                  </div>
                  <div className="relative flex">
                    <div className="relative flex-1">
                      <Tag className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Add tags"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent transition-all"
                      />
                    </div>
                    <Button
                      onClick={handleAddTag}
                      disabled={!tagInput.trim()}
                      className="ml-2 bg-zinc-800 hover:bg-zinc-700 text-white"
                    >
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">Press Enter to add multiple tags</p>
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
                      <label htmlFor="category" className="block text-sm font-medium text-zinc-400 mb-2">
                        Category
                      </label>
                      <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent transition-all appearance-none"
                      >
                        <option value="">Select a category</option>
                        <option value="motivation">Motivation</option>
                        <option value="fitness">Fitness</option>
                        <option value="business">Business</option>
                        <option value="lifestyle">Lifestyle</option>
                      </select>
                    </div>

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
                <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center mb-4">
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

            {/* Vimeo Connection Status */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4">Vimeo Integration</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Your videos are securely uploaded to Vimeo for processing and storage. Make sure your Vimeo account has
                sufficient upload quota.
              </p>
              <Button onClick={checkVimeoConnection} variant="outline" size="sm" className="w-full">
                Test Vimeo Connection
              </Button>
            </div>
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
