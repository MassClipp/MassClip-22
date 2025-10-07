"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Clock } from "lucide-react"
import { Upload, Film, Music, ImageIcon, File, RefreshCw, Loader2, Pause, CheckCircle, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import FirestoreIndexHelper from "@/components/firestore-index-helper"
import ProfileSetup from "@/components/profile-setup"
import { chunkedUploadService } from "@/lib/chunked-upload-service"
import { uploadQueueManager, type QueuedUpload } from "@/lib/upload-queue-manager"
import FolderSidebar from "@/components/folder-sidebar"
import { Menu } from "lucide-react"

interface UploadType {
  id: string
  uid: string
  fileUrl: string
  filename: string
  title: string
  type: "video" | "audio" | "image" | "document" | "other"
  size?: number
  mimeType?: string
  createdAt: Date
  updatedAt: Date
}

interface FolderType {
  id: string
  name: string
  path: string
  parentId: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
}

const FILE_TYPE_ICONS = {
  video: Film,
  audio: Music,
  image: ImageIcon,
  document: File,
  other: File,
}

const FILE_TYPE_COLORS = {
  video: "text-blue-500",
  audio: "text-green-500",
  image: "text-purple-500",
  document: "text-orange-500",
  other: "text-gray-500",
}

const STATUS_ICONS = {
  queued: Clock,
  uploading: Loader2,
  completed: CheckCircle,
  error: AlertCircle,
  paused: Pause,
}

const STATUS_COLORS = {
  queued: "text-zinc-400",
  uploading: "text-white",
  completed: "text-zinc-300",
  error: "text-zinc-500",
  paused: "text-zinc-400",
}

export default function UploadPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Declare isSidebarOpen

  // State
  const [uploads, setUploads] = useState<UploadType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedUpload, setSelectedUpload] = useState<UploadType | null>(null)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [hasIndexError, setHasIndexError] = useState(false)
  const [hasUserProfile, setHasUserProfile] = useState<boolean | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [selectedUploads, setSelectedUploads] = useState<string[]>([])
  const [showAddToFreeContentDialog, setShowAddToFreeContentDialog] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<QueuedUpload[]>([])
  const [queueStats, setQueueStats] = useState({
    total: 0,
    queued: 0,
    uploading: 0,
    completed: 0,
    error: 0,
    paused: 0,
  })
  const [folders, setFolders] = useState<FolderType[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string>("main") // Default to main instead of root
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false)
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [userToken, setUserToken] = useState<string>("")

  // Initialize upload services
  useEffect(() => {
    if (user) {
      // Set auth token for chunked upload service
      user.getIdToken().then((token) => {
        setUserToken(token)
        chunkedUploadService.setAuthToken(token)
      })

      // Set up global progress callback
      uploadQueueManager.setGlobalProgressCallback((queue) => {
        setUploadQueue(queue)
        setQueueStats(uploadQueueManager.getQueueStatus())
      })
    }
  }, [user])

  // Check if user has a profile
  const checkUserProfile = useCallback(async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()

      const response = await fetch(`/api/user-profile?uid=${user.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setHasUserProfile(true)
        setUsername(data.username)
      } else {
        setHasUserProfile(false)
      }
    } catch (error) {
      console.error("Error checking user profile:", error)
      setHasUserProfile(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      checkUserProfile()
    }
  }, [user, checkUserProfile])

  // Fetch uploads
  const fetchUploads = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)

      const token = await user?.getIdToken()
      if (!token) {
        console.error("No auth token available")
        toast({
          title: "Authentication Error",
          description: "Please sign in again",
          variant: "destructive",
        })
        return
      }

      const params = new URLSearchParams()
      if (filterType !== "all") params.append("type", filterType)
      if (searchTerm) params.append("search", searchTerm)

      params.append("folder", selectedFolderId)

      console.log(`[v0] Fetching uploads for folder: ${selectedFolderId}`)

      const response = await fetch(`/api/uploads?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API Error:", response.status, errorData)

        if (errorData.indexError) {
          setHasIndexError(true)
          toast({
            title: "Database Setup Required",
            description: "Firestore indexes need to be created. Please check the setup instructions below.",
            variant: "destructive",
          })
          return
        }

        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log(`[v0] Received ${data.uploads.length} uploads for folder: ${selectedFolderId}`)

      setUploads(
        data.uploads.map((upload: any) => ({
          ...upload,
          createdAt: new Date(upload.createdAt),
          updatedAt: new Date(upload.updatedAt),
        })),
      )
    } catch (error) {
      console.error("Error fetching uploads:", error)
      toast({
        title: "Error Loading Uploads",
        description: error instanceof Error ? error.message : "Failed to load uploads",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user, filterType, searchTerm, selectedFolderId, toast]) // Add selectedFolderId dependency

  useEffect(() => {
    if (user && hasUserProfile) {
      fetchUploads()
    }
  }, [user, hasUserProfile, fetchUploads])

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    if (!user) {
      console.log("[v0] No user available for fetching folders")
      return
    }

    try {
      console.log("[v0] Fetching folders for user:", user.uid)
      console.log("[v0] User object:", { uid: user.uid, email: user.email, emailVerified: user.emailVerified })

      setLoadingFolders(true)

      console.log("[v0] Getting ID token...")
      const token = await user.getIdToken()
      console.log("[v0] Got ID token, length:", token?.length)
      console.log("[v0] Token preview:", token?.substring(0, 50) + "...")

      const response = await fetch("/api/folders", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("[v0] Folders API response status:", response.status)
      console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Folders API response data:", data)
        setFolders(
          data.folders.map((folder: any) => ({
            ...folder,
            createdAt: new Date(folder.createdAt),
            updatedAt: new Date(folder.updatedAt),
          })),
        )
        console.log("[v0] Set folders state with", data.folders.length, "folders")
      } else {
        const errorData = await response.json()
        console.error("[v0] Folders API error:", errorData)
        console.error("[v0] Full response:", response)
      }
    } catch (error) {
      console.error("[v0] Error fetching folders:", error)
      if (error instanceof Error) {
        console.error("[v0] Error name:", error.name)
        console.error("[v0] Error message:", error.message)
        console.error("[v0] Error stack:", error.stack)
      }
    } finally {
      setLoadingFolders(false)
    }
  }, [user])

  useEffect(() => {
    if (user && hasUserProfile) {
      fetchFolders()
    }
  }, [user, hasUserProfile, fetchFolders])

  // Handle file upload with chunked upload service
  const handleFileUpload = async (files: FileList) => {
    if (!user || files.length === 0 || !hasUserProfile) return

    console.log(`🔍 [v0] Starting upload for ${files.length} files`)
    console.log(`📁 [v0] Selected folder ID: ${selectedFolderId}`)
    console.log(
      `📂 [v0] Available folders:`,
      folders.map((f) => ({ id: f.id, name: f.name, path: f.path })),
    )

    // Get folder path for the selected folder
    const selectedFolder = folders.find((f) => f.id === selectedFolderId)
    const folderPath = selectedFolder?.path || null

    console.log(`🎯 [v0] Selected folder object:`, selectedFolder)
    console.log(`🛤️ [v0] Resolved folder path:`, folderPath)

    const finalFolderId = selectedFolderId === "main" ? undefined : selectedFolderId
    console.log(`✅ [v0] Final folder ID to pass to queue:`, finalFolderId)

    for (const file of Array.from(files)) {
      const fileName = file.name.toLowerCase()
      const fileType = file.type.toLowerCase()

      // Check multiple conditions for ZIP files
      const isZipByExtension = fileName.endsWith(".zip")
      const isZipByMimeType =
        fileType === "application/zip" ||
        fileType === "application/x-zip-compressed" ||
        fileType === "application/x-zip" ||
        (fileType === "application/octet-stream" && fileName.endsWith(".zip"))

      const isZip = isZipByExtension || isZipByMimeType

      console.log(`🔍 [v0] File detection for: ${file.name}`)
      console.log(`   - File type: "${file.type}" (empty: ${file.type === ""})`)
      console.log(`   - File extension: ${fileName.split(".").pop()}`)
      console.log(`   - Is ZIP by extension: ${isZipByExtension}`)
      console.log(`   - Is ZIP by MIME type: ${isZipByMimeType}`)
      console.log(`   - Final decision: ${isZip ? "ZIP FILE" : "REGULAR FILE"}`)

      if (isZip) {
        console.log(`🗜️ [v0] Processing ZIP file: ${file.name}`)

        try {
          const token = await user.getIdToken()
          const formData = new FormData()
          formData.append("zipFile", file)
          if (finalFolderId) {
            formData.append("folderId", finalFolderId)
          }
          if (folderPath) {
            formData.append("folderPath", folderPath)
          }

          console.log(`📤 [v0] Sending ZIP to /api/uploads/zip`)

          const response = await fetch("/api/uploads/zip", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error("❌ [v0] Failed to upload ZIP:", errorData)
            throw new Error(errorData.error || "Failed to upload ZIP file")
          }

          const result = await response.json()
          console.log(`✅ [v0] ZIP processed: ${result.totalFiles} files extracted`)

          toast({
            title: "ZIP Upload Complete",
            description: `${file.name} processed successfully. ${result.totalFiles} files extracted.`,
          })

          // Refresh uploads list after ZIP processing
          setTimeout(() => fetchUploads(), 1000)
        } catch (error) {
          console.error(`❌ [v0] ZIP upload failed:`, error)
          toast({
            title: "ZIP Upload Failed",
            description: error instanceof Error ? error.message : "Failed to upload ZIP file",
            variant: "destructive",
          })
        }
      } else {
        // Handle regular files with chunked upload
        const priority = file.size < 50 * 1024 * 1024 ? 1 : 0 // Prioritize smaller files

        console.log(
          `📤 [v0] Adding file ${file.name} to queue with folderId: ${finalFolderId}, folderPath: ${folderPath}`,
        )
        console.log(`   File type: ${file.type || "empty/unknown"}`)
        console.log(`   File size: ${file.size} bytes`)

        const queueId = uploadQueueManager.addToQueue(file, priority, finalFolderId, folderPath)

        // Set up individual progress callback
        uploadQueueManager.setProgressCallback(queueId, async (queuedUpload) => {
          console.log(`[v0] Upload progress callback triggered for: ${queuedUpload.file.name}`)
          console.log(`[v0] Status: ${queuedUpload.status}`)
          console.log(`[v0] File type: ${queuedUpload.file.type}`)
          console.log(`[v0] Upload ID: ${queuedUpload.uploadId}`)
          console.log(`[v0] Firestore Doc ID: ${queuedUpload.firestoreDocId}`)
          console.log(`[v0] File URL: ${queuedUpload.fileUrl}`)

          if (queuedUpload.status === "completed") {
            toast({
              title: "Upload Complete!",
              description: `${queuedUpload.file.name} has been uploaded successfully.`,
            })

            const isVideo = queuedUpload.file.type.startsWith("video/")

            if (isVideo && queuedUpload.firestoreDocId && queuedUpload.fileUrl) {
              console.log(
                `[v0] Video upload completed, triggering transcription for Firestore doc: ${queuedUpload.firestoreDocId}`,
              )

              try {
                const token = await user.getIdToken()
                const transcribeResponse = await fetch("/api/uploads/auto-transcribe", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    uploadId: queuedUpload.firestoreDocId, // Use Firestore document ID
                    videoUrl: queuedUpload.fileUrl,
                    mimeType: queuedUpload.file.type,
                  }),
                })

                if (transcribeResponse.ok) {
                  console.log(
                    `[v0] Transcription started successfully for Firestore doc: ${queuedUpload.firestoreDocId}`,
                  )
                  toast({
                    title: "Transcription Started",
                    description: "Your video is being transcribed in the background.",
                  })
                } else {
                  const error = await transcribeResponse.json()
                  console.error(`[v0] Transcription failed:`, error)
                }
              } catch (error) {
                console.error(`[v0] Failed to trigger transcription:`, error)
              }
            }

            // Refresh uploads list
            setTimeout(() => fetchUploads(), 1000)
          } else if (queuedUpload.status === "error") {
            toast({
              title: "Upload Failed",
              description: queuedUpload.error || `Failed to upload ${queuedUpload.file.name}`,
              variant: "destructive",
            })
          }
        })
      }
    }

    const regularFiles = Array.from(files).filter((file) => {
      const fileName = file.name.toLowerCase()
      const fileType = file.type.toLowerCase()
      const isZipByExtension = fileName.endsWith(".zip")
      const isZipByMimeType =
        fileType === "application/zip" ||
        fileType === "application/x-zip-compressed" ||
        fileType === "application/x-zip" ||
        (fileType === "application/octet-stream" && fileName.endsWith(".zip"))
      return !(isZipByExtension || isZipByMimeType)
    })

    if (regularFiles.length > 0) {
      toast({
        title: "Files Added to Queue",
        description: `${regularFiles.length} file(s) added to upload queue${selectedFolder ? ` in "${selectedFolder.name}"` : ""}`,
      })
    }
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }

  // Queue management functions
  const pauseUpload = (queueId: string) => {
    uploadQueueManager.pauseUpload(queueId)
  }

  const resumeUpload = (queueId: string) => {
    uploadQueueManager.resumeUpload(queueId)
  }

  const retryUpload = (queueId: string) => {
    uploadQueueManager.retryUpload(queueId)
  }

  const removeFromQueue = (queueId: string) => {
    uploadQueueManager.removeFromQueue(queueId)
  }

  const clearCompletedUploads = () => {
    uploadQueueManager.clearCompleted()
  }

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size"
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  // Format speed
  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond === 0) return "0 B/s"
    const sizes = ["B/s", "KB/s", "MB/s", "GB/s"]
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024))
    return Math.round((bytesPerSecond / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  // Format time
  const formatTime = (seconds: number) => {
    if (seconds === 0 || !isFinite(seconds)) return "Unknown"
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  // Handle rename
  const handleRename = async () => {
    if (!selectedUpload || !user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/uploads/${selectedUpload.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle }),
      })

      if (!response.ok) {
        throw new Error("Failed to rename upload")
      }

      toast({
        title: "Success!",
        description: "Upload renamed successfully",
      })

      fetchUploads()
      setIsRenameDialogOpen(false)
      setSelectedUpload(null)
      setNewTitle("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename upload",
        variant: "destructive",
      })
    }
  }

  // Handle delete
  const handleDelete = async (upload: UploadType) => {
    if (!user) return

    if (!confirm(`Are you sure you want to delete "${upload.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/uploads/${upload.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete upload")
      }

      toast({
        title: "Success!",
        description: "Upload deleted successfully",
      })

      fetchUploads()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete upload",
        variant: "destructive",
      })
    }
  }

  // Copy URL to clipboard
  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: "Copied!",
        description: "File URL copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
      })
    }
  }

  // Get stats
  const stats = {
    total: uploads.length,
    video: uploads.filter((u) => u.type === "video").length,
    audio: uploads.filter((u) => u.type === "audio").length,
    image: uploads.filter((u) => u.type === "image").length,
    document: uploads.filter((u) => u.type === "document").length,
    other: uploads.filter((u) => u.type === "other").length,
  }

  // Toggle selection of an upload
  const toggleUploadSelection = (uploadId: string) => {
    if (selectedUploads.includes(uploadId)) {
      setSelectedUploads(selectedUploads.filter((id) => id !== uploadId))
    } else {
      setSelectedUploads([...selectedUploads, uploadId])
    }
  }

  // Add selected uploads to free content
  const addToFreeContent = async () => {
    if (!user || selectedUploads.length === 0) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/free-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uploadIds: selectedUploads }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add to free content")
      }

      toast({
        title: "Success!",
        description: `${selectedUploads.length} item(s) added to free content`,
      })

      setSelectedUploads([])
      setShowAddToFreeContentDialog(false)
    } catch (error) {
      console.error("Error adding to free content:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add to free content",
        variant: "destructive",
      })
    }
  }

  // Handle profile setup completion
  const handleProfileSetupComplete = (username: string) => {
    setHasUserProfile(true)
    setUsername(username)
    fetchUploads()
  }

  // Handle folder creation
  const handleFolderCreated = () => {
    console.log("[v0] Folder created, refreshing folder list...")
    fetchFolders()
    toast({
      title: "Success!",
      description: "Folder created successfully",
    })
  }

  const handleFolderSelect = (folderId: string) => {
    console.log(`[v0] Folder selected: ${folderId}`)
    setSelectedFolderId(folderId)
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Authentication Required</h2>
          <p className="text-zinc-400">Please sign in to access your uploads.</p>
        </div>
      </div>
    )
  }

  // Show profile setup if user doesn't have a profile
  if (hasUserProfile === false) {
    return (
      <div className="container max-w-4xl py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-8 text-center">Complete Your Profile</h1>
        <ProfileSetup uid={user.uid} email={user.email} onComplete={handleProfileSetupComplete} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Folder Sidebar */}
      <FolderSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        selectedFolderId={selectedFolderId}
        onFolderSelect={handleFolderSelect}
        onFolderCreated={handleFolderCreated}
      />

      {/* Overlay when sidebar is open */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsSidebarOpen(false)} />}

      {/* Index Setup Helper */}
      {hasIndexError && <FirestoreIndexHelper />}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-zinc-800/50">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white tracking-tight">Content Library</h1>
            {username && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full"></div>
                <span>Storage path: creators/{username}/</span>
              </div>
            )}
          </div>
          <p className="text-zinc-400">Upload and manage your content files</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sidebar toggle button */}
          <Button
            variant="outline"
            onClick={() => setIsSidebarOpen(true)}
            className="border-zinc-700/50 bg-zinc-900/50 hover:bg-zinc-800/50 text-zinc-300"
          >
            <Menu className="h-4 w-4 mr-2" />
            Folders
          </Button>

          <Button
            variant="outline"
            onClick={() => fetchUploads()}
            className="border-zinc-700/50 bg-zinc-900/50 hover:bg-zinc-800/50 text-zinc-300"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-black hover:bg-zinc-100 font-medium px-6"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
            accept="video/*,audio/*,image/*,.pdf,.doc,.docx,.txt,.zip,application/zip,application/x-zip-compressed"
          />
        </div>
      </div>

      {uploadQueue.length > 0 && (
        <div className="bg-zinc-900/30 border border-zinc-800/30 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800/30">
            <div className="flex items-center gap-3">
              <h3 className="font-medium text-white">Upload Progress</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">{queueStats.total} files</span>
                <div className="w-1 h-1 bg-zinc-600 rounded-full"></div>
                <span className="text-xs text-zinc-400">{queueStats.uploading} active</span>
              </div>
            </div>
            {queueStats.completed > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCompletedUploads}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 text-xs transition-colors"
              >
                Clear Completed
              </Button>
            )}
          </div>
          <div className="p-4">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {uploadQueue.map((queuedUpload) => {
                const StatusIcon = STATUS_ICONS[queuedUpload.status]
                const progress = queuedUpload.progress

                return (
                  <div key={queuedUpload.id} className="flex items-center gap-4 p-3 bg-zinc-800/20 rounded-md">
                    <StatusIcon
                      className={`h-4 w-4 text-zinc-400 ${queuedUpload.status === "uploading" ? "animate-spin" : ""}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white truncate">{queuedUpload.file.name}</span>
                        <span className="text-xs text-zinc-400">{formatFileSize(queuedUpload.file.size)}</span>
                      </div>
                      {progress && (
                        <div className="space-y-1">
                          <Progress value={progress.percentage} className="h-2 bg-zinc-800/60" />
                          <div className="flex justify-between text-xs text-zinc-500">
                            <span>{Math.round(progress.percentage)}%</span>
                            {progress.speed > 0 && <span>{formatSpeed(progress.speed)}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {queuedUpload.status === "uploading" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => uploadQueueManager.pauseUpload(queuedUpload.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Pause className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="text-center py-12">
        <p className="text-zinc-400">Upload page content continues here...</p>
        <p className="text-zinc-500 text-sm mt-2">Vex folder organizer has been removed</p>
      </div>
    </div>
  )
}
