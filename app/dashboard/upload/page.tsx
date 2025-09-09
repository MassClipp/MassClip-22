"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import {
  Upload,
  Search,
  Grid3X3,
  List,
  Trash2,
  Edit2,
  Film,
  Music,
  ImageIcon,
  File,
  RefreshCw,
  MoreVertical,
  Eye,
  Copy,
  Loader2,
  PlusCircle,
  Pause,
  Play,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import FirestoreIndexHelper from "@/components/firestore-index-helper"
import ProfileSetup from "@/components/profile-setup"
import { VideoPreviewPlayer } from "@/components/video-preview-player"
import { chunkedUploadService } from "@/lib/chunked-upload-service"
import { uploadQueueManager, type QueuedUpload } from "@/lib/upload-queue-manager"
import { CreateFolderDialog } from "@/components/create-folder-dialog"
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
  const [selectedFolderId, setSelectedFolderId] = useState<string>("root")
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false)
  const [loadingFolders, setLoadingFolders] = useState(false)

  // Initialize upload services
  useEffect(() => {
    if (user) {
      // Set auth token for chunked upload service
      user.getIdToken().then((token) => {
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

      if (selectedFolderId === "main") {
        params.append("folder", "main") // Files without folder assignment
      } else if (selectedFolderId !== "root") {
        params.append("folderId", selectedFolderId)
      }

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

    console.log(`🔍 [Chunked Upload] Starting upload for ${files.length} files`)
    console.log(`📁 [Chunked Upload] Selected folder: ${selectedFolderId}`)

    // Get folder path for the selected folder
    const selectedFolder = folders.find((f) => f.id === selectedFolderId)
    const folderPath = selectedFolder?.path || null

    // Add files to upload queue with folder information
    Array.from(files).forEach((file, index) => {
      const priority = file.size < 50 * 1024 * 1024 ? 1 : 0 // Prioritize smaller files
      const queueId = uploadQueueManager.addToQueue(
        file,
        priority,
        selectedFolderId === "root" ? undefined : selectedFolderId,
        folderPath,
      )

      // Set up individual progress callback
      uploadQueueManager.setProgressCallback(queueId, (queuedUpload) => {
        if (queuedUpload.status === "completed") {
          toast({
            title: "Upload Complete!",
            description: `${queuedUpload.file.name} has been uploaded successfully.`,
          })
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
    })

    toast({
      title: "Files Added to Queue",
      description: `${files.length} file(s) added to upload queue${selectedFolder ? ` in "${selectedFolder.name}"` : ""}`,
    })
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
    setSelectedFolderId(folderId)
    // Refresh uploads when folder changes
    setTimeout(() => fetchUploads(), 100)
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
          <h1 className="text-2xl font-semibold text-white tracking-tight">Content Library</h1>
          <p className="text-zinc-400 text-sm">
            Manage and organize your digital assets with enterprise-grade upload capabilities
          </p>
          {username && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full"></div>
              <span>Storage path: creators/{username}/</span>
            </div>
          )}
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
            accept="video/*,audio/*,image/*,.pdf,.doc,.docx,.txt"
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
                      {queuedUpload.status === "paused" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => uploadQueueManager.resumeUpload(queuedUpload.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => uploadQueueManager.cancelUpload(queuedUpload.id)}
                        className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div
        className="border-2 border-dashed border-zinc-700/50 rounded-lg bg-zinc-900/20 hover:border-zinc-600/50 hover:bg-zinc-900/30 transition-all duration-200 cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center py-12 px-6">
          <div className="w-12 h-12 bg-zinc-800/50 rounded-lg flex items-center justify-center mb-4">
            <Upload className="h-6 w-6 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Upload your files</h3>
          <p className="text-zinc-400 text-center text-sm max-w-md">
            Drag and drop files here, or click to browse. Advanced chunked upload technology ensures reliable transfers
            for large files.
          </p>
        </div>
      </div>

      {/* Selected Items Actions */}
      {selectedUploads.length > 0 && (
        <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-300">
            <span className="font-medium">{selectedUploads.length}</span> item(s) selected
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-transparent"
              onClick={() => setSelectedUploads([])}
            >
              Clear Selection
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-transparent"
              onClick={() => setShowAddToFreeContentDialog(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add to Free Content
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Files", value: stats.total, color: "text-white" },
          { label: "Videos", value: stats.video, color: "text-white" },
          { label: "Audio", value: stats.audio, color: "text-white" },
          { label: "Images", value: stats.image, color: "text-white" },
        ].map((stat, index) => (
          <div key={index} className="bg-zinc-900/30 border border-zinc-800/30 rounded-lg p-4">
            <div className={`text-2xl font-semibold ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-xs text-white uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900/30 border-zinc-800/30 text-white placeholder:text-zinc-500"
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 bg-zinc-900/30 border-zinc-800/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/30 border border-zinc-800/30 rounded-md p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className={viewMode === "grid" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {uploads.length === 0 ? (
        <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-lg">
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 bg-zinc-800/50 rounded-lg flex items-center justify-center mb-6">
              <Upload className="h-8 w-8 text-zinc-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No files uploaded</h3>
            <p className="text-zinc-400 text-center mb-8 max-w-md text-sm">
              Start building your content library by uploading your first file. Our advanced upload system handles large
              files with ease.
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-white text-black hover:bg-zinc-100 font-medium px-6"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload First File
            </Button>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {uploads.map((upload, index) => {
                const IconComponent = FILE_TYPE_ICONS[upload.type]
                const colorClass = FILE_TYPE_COLORS[upload.type]
                const isSelected = selectedUploads.includes(upload.id)

                return (
                  <motion.div
                    key={upload.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                  >
                    <div
                      className={`bg-zinc-900/30 border border-zinc-800/30 rounded-lg hover:border-zinc-700/50 transition-all duration-200 cursor-pointer group ${
                        isSelected ? "ring-2 ring-white/20 border-white/20" : ""
                      }`}
                      onClick={() => toggleUploadSelection(upload.id)}
                    >
                      <div className="p-3">
                        <div className="mb-3 relative">
                          {upload.type === "video" ? (
                            <VideoPreviewPlayer videoUrl={upload.fileUrl} title={upload.title} />
                          ) : upload.type === "image" ? (
                            <div className="aspect-square bg-zinc-800/50 rounded-md flex items-center justify-center relative overflow-hidden">
                              <img
                                src={upload.fileUrl || "/placeholder.svg"}
                                alt={upload.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = "none"
                                  target.nextElementSibling?.classList.remove("hidden")
                                }}
                              />
                              <div className="hidden absolute inset-0 flex items-center justify-center">
                                <IconComponent className={`h-8 w-8 ${colorClass}`} />
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-square bg-zinc-800/50 rounded-md flex items-center justify-center">
                              <IconComponent className={`h-8 w-8 ${colorClass}`} />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-medium text-white text-sm truncate">{upload.title}</h3>
                          <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span className="uppercase tracking-wide">{upload.type}</span>
                            <span>{formatFileSize(upload.size)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs text-zinc-500">
                            {formatDistanceToNow(upload.createdAt, { addSuffix: true })}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(upload.fileUrl, "_blank")
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedUpload(upload)
                                  setNewTitle(upload.title)
                                  setIsRenameDialogOpen(true)
                                }}
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyToClipboard(upload.fileUrl)
                                }}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy URL
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(upload)
                                }}
                                className="text-red-400"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="bg-zinc-900/30 border border-zinc-800/30 rounded-lg">
              <div className="divide-y divide-zinc-800/30">
                {uploads.map((upload, index) => {
                  const IconComponent = FILE_TYPE_ICONS[upload.type]
                  const colorClass = FILE_TYPE_COLORS[upload.type]
                  const isSelected = selectedUploads.includes(upload.id)

                  return (
                    <motion.div
                      key={upload.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.01 }}
                      className={`flex items-center gap-4 p-4 hover:bg-zinc-800/20 transition-colors cursor-pointer ${
                        isSelected ? "bg-zinc-800/30" : ""
                      }`}
                      onClick={() => toggleUploadSelection(upload.id)}
                    >
                      <div className="w-10 h-10 bg-zinc-800/50 rounded-md flex items-center justify-center">
                        {isSelected ? (
                          <CheckCircle className="h-5 w-5 text-white" />
                        ) : (
                          <IconComponent className={`h-5 w-5 ${colorClass}`} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{upload.title}</h3>
                        <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1">
                          <span className="uppercase tracking-wide">{upload.type}</span>
                          <span>{formatFileSize(upload.size)}</span>
                          <span>{formatDistanceToNow(upload.createdAt, { addSuffix: true })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(upload.fileUrl, "_blank")
                          }}
                          className="text-zinc-400 hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => e.stopPropagation()}
                              className="text-zinc-400 hover:text-white"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedUpload(upload)
                                setNewTitle(upload.title)
                                setIsRenameDialogOpen(true)
                              }}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(upload.fileUrl)
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy URL
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(upload)
                              }}
                              className="text-red-400"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}
        </AnimatePresence>
      )}

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Rename Upload</DialogTitle>
            <DialogDescription className="text-zinc-400">Enter a new title for this upload.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new title..."
              className="bg-zinc-800/50 border-zinc-700 text-white"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRenameDialogOpen(false)}
                className="border-zinc-700 text-zinc-300"
              >
                Cancel
              </Button>
              <Button onClick={handleRename} className="bg-white text-black">
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddToFreeContentDialog} onOpenChange={setShowAddToFreeContentDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Add to Free Content</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Add {selectedUploads.length} selected item(s) to your free content library?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddToFreeContentDialog(false)}
              className="border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button onClick={addToFreeContent} className="bg-white text-black">
              Add to Free Content
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateFolderDialog
        isOpen={isCreateFolderDialogOpen}
        onClose={() => setIsCreateFolderDialogOpen(false)}
        parentFolderId={selectedFolderId || null}
        onFolderCreated={() => {
          console.log("[v0] Folder created, refreshing folder list...")
          fetchFolders()
          toast({
            title: "Success!",
            description: "Folder created successfully",
          })
        }}
      />
    </div>
  )
}
