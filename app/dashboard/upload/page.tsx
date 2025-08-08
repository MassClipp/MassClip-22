"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Upload, Search, Grid3X3, List, Trash2, Edit2, Film, Music, ImageIcon, File, Filter, RefreshCw, MoreVertical, Eye, Copy, Loader2, PlusCircle, Pause, Play, X, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import FirestoreIndexHelper from "@/components/firestore-index-helper"
import ProfileSetup from "@/components/profile-setup"
import { VideoPreviewPlayer } from "@/components/video-preview-player"
import { chunkedUploadService } from "@/lib/chunked-upload-service"
import { uploadQueueManager, type QueuedUpload } from "@/lib/upload-queue-manager"

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
  queued: "text-yellow-500",
  uploading: "text-blue-500",
  completed: "text-green-500",
  error: "text-red-500",
  paused: "text-orange-500",
}

export default function UploadPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    paused: 0
  })

  // Initialize upload services
  useEffect(() => {
    if (user) {
      // Set auth token for chunked upload service
      user.getIdToken().then(token => {
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
  }, [user, filterType, searchTerm, toast])

  useEffect(() => {
    if (user && hasUserProfile) {
      fetchUploads()
    }
  }, [user, hasUserProfile, fetchUploads])

  // Handle file upload with chunked upload service
  const handleFileUpload = async (files: FileList) => {
    if (!user || files.length === 0 || !hasUserProfile) return

    console.log(`🔍 [Chunked Upload] Starting upload for ${files.length} files`)

    // Add files to upload queue
    Array.from(files).forEach((file, index) => {
      const priority = file.size < 50 * 1024 * 1024 ? 1 : 0 // Prioritize smaller files
      const queueId = uploadQueueManager.addToQueue(file, priority)
      
      // Set up individual progress callback
      uploadQueueManager.setProgressCallback(queueId, (queuedUpload) => {
        if (queuedUpload.status === 'completed') {
          toast({
            title: "Upload Complete!",
            description: `${queuedUpload.file.name} has been uploaded successfully.`,
          })
          // Refresh uploads list
          setTimeout(() => fetchUploads(), 1000)
        } else if (queuedUpload.status === 'error') {
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
      description: `${files.length} file(s) added to upload queue`,
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
    <div className="space-y-8">
      {/* Index Setup Helper */}
      {hasIndexError && <FirestoreIndexHelper />}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Uploads</h1>
          <p className="text-zinc-400 mt-1">Manage your content library with advanced chunked uploads</p>
          {username && (
            <p className="text-sm text-zinc-500 mt-1">
              Files will be uploaded to your creator folder: <span className="text-zinc-300">creators/{username}/</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => fetchUploads()} className="border-zinc-700 hover:bg-zinc-800">
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
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

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Upload Queue ({queueStats.total})</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {queueStats.uploading} uploading
              </Badge>
              <Badge variant="outline" className="text-xs">
                {queueStats.queued} queued
              </Badge>
              {queueStats.completed > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompletedUploads}
                  className="border-zinc-700"
                >
                  Clear Completed
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {uploadQueue.map((queuedUpload) => {
                const StatusIcon = STATUS_ICONS[queuedUpload.status]
                const statusColor = STATUS_COLORS[queuedUpload.status]
                const progress = queuedUpload.progress

                return (
                  <div key={queuedUpload.id} className="space-y-2 p-3 bg-zinc-800/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-4 w-4 ${statusColor} ${queuedUpload.status === 'uploading' ? 'animate-spin' : ''}`} />
                        <div>
                          <span className="text-sm font-medium text-white">{queuedUpload.file.name}</span>
                          <div className="text-xs text-zinc-400">
                            {formatFileSize(queuedUpload.file.size)}
                            {progress && progress.speed > 0 && (
                              <span> • {formatSpeed(progress.speed)} • ETA: {formatTime(progress.eta)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {queuedUpload.status === 'uploading' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => pauseUpload(queuedUpload.id)}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {queuedUpload.status === 'paused' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resumeUpload(queuedUpload.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {queuedUpload.status === 'error' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => retryUpload(queuedUpload.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromQueue(queuedUpload.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {progress && (
                      <div className="space-y-1">
                        <Progress 
                          value={(progress.uploadedBytes / progress.fileSize) * 100} 
                          className="h-2" 
                        />
                        <div className="flex justify-between text-xs text-zinc-400">
                          <span>{Math.round((progress.uploadedBytes / progress.fileSize) * 100)}%</span>
                          <span>{progress.completedChunks}/{progress.totalChunks} chunks</span>
                        </div>
                      </div>
                    )}
                    
                    {queuedUpload.error && (
                      <p className="text-sm text-red-400">{queuedUpload.error}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drag and Drop Area */}
      <Card
        className="bg-zinc-900/60 border-zinc-800/50 border-2 border-dashed hover:border-zinc-700 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="h-12 w-12 text-zinc-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Drop files here or click to upload</h3>
          <p className="text-zinc-400 text-center">
            Advanced chunked uploads with parallel processing
            <br />
            <span className="text-sm text-zinc-500">Supports large files, resume capability, and real-time progress</span>
          </p>
        </CardContent>
      </Card>

      {/* Selected Items Actions */}
      {selectedUploads.length > 0 && (
        <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-300">
            <span className="font-medium">{selectedUploads.length}</span> item(s) selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-zinc-700" onClick={() => setSelectedUploads([])}>
              Clear Selection
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700"
              onClick={() => setShowAddToFreeContentDialog(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add to Free Content
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-zinc-400">Total Files</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{stats.video}</div>
            <div className="text-sm text-zinc-400">Videos</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">{stats.audio}</div>
            <div className="text-sm text-zinc-400">Audio</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-500">{stats.image}</div>
            <div className="text-sm text-zinc-400">Images</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-500">{stats.document}</div>
            <div className="text-sm text-zinc-400">Documents</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-500">{stats.other}</div>
            <div className="text-sm text-zinc-400">Other</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
            <Input
              placeholder="Search uploads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700"
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="border-zinc-700"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="border-zinc-700"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {uploads.length === 0 ? (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Upload className="h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No uploads yet</h3>
            <p className="text-zinc-400 text-center mb-6 max-w-md">
              Upload your first file to start building your content library. Advanced chunked uploads ensure fast and reliable transfers.
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Your First File
            </Button>
          </CardContent>
        </Card>
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
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card
                      className={`bg-zinc-900/60 border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300 group ${
                        isSelected ? "ring-2 ring-red-500" : ""
                      }`}
                      onClick={() => toggleUploadSelection(upload.id)}
                    >
                      <CardContent className="p-3">
                        <div className="mb-2 relative">
                          {upload.type === "video" ? (
                            <VideoPreviewPlayer videoUrl={upload.fileUrl} title={upload.title} />
                          ) : upload.type === "image" ? (
                            <div className="aspect-square bg-zinc-800 rounded-lg flex items-center justify-center relative overflow-hidden">
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
                              <div className="hidden w-full h-full flex items-center justify-center">
                                <IconComponent className={`h-8 w-8 ${colorClass}`} />
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-square bg-zinc-800 rounded-lg flex items-center justify-center">
                              <IconComponent className={`h-8 w-8 ${colorClass}`} />
                            </div>
                          )}

                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute top-2 left-2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3 text-white"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}

                          {/* Action buttons overlay - only show for non-video types */}
                          {upload.type !== "video" && (
                            <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(upload.fileUrl, "_blank")
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="secondary" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
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
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-white truncate">{upload.title}</h3>
                            <Badge variant="outline" className="text-xs border-zinc-700">
                              {upload.type}
                            </Badge>
                          </div>

                          <div className="text-xs text-zinc-400 space-y-1">
                            <div>{formatFileSize(upload.size)}</div>
                            <div>{formatDistanceToNow(upload.createdAt, { addSuffix: true })}</div>
                          </div>

                          {/* Action buttons for videos - show below the video */}
                          {upload.type === "video" && (
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyToClipboard(upload.fileUrl)
                                }}
                              >
                                <Copy className="h-3 w-3 mr-1" /> Copy URL
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="px-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
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
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            // List view
            <Card className="bg-zinc-900/60 border-zinc-800/50">
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-800">
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
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                        className={`flex items-center gap-4 p-4 hover:bg-zinc-800/30 transition-colors cursor-pointer ${
                          isSelected ? "bg-zinc-800/50" : ""
                        }`}
                        onClick={() => toggleUploadSelection(upload.id)}
                      >
                        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                          {isSelected ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-red-500"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <IconComponent className={`h-5 w-5 ${colorClass}`} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">{upload.title}</h3>
                          <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1">
                            <Badge variant="outline" className="text-xs border-zinc-700">
                              {upload.type}
                            </Badge>
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
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
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
              </CardContent>
            </Card>
          )}
        </AnimatePresence>
      )}

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Rename Upload</DialogTitle>
            <DialogDescription>Change the display name for this upload</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new title"
              className="bg-zinc-800 border-zinc-700"
            />

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRenameDialogOpen(false)
                  setSelectedUpload(null)
                  setNewTitle("")
                }}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                disabled={!newTitle.trim()}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              >
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Free Content Dialog */}
      <Dialog open={showAddToFreeContentDialog} onOpenChange={setShowAddToFreeContentDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Add to Free Content</DialogTitle>
            <DialogDescription>
              Add selected items to your free content section. These will be visible to all visitors on your profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-zinc-800/50 p-4 rounded-lg">
              <h4 className="font-medium text-white mb-2">Selected Items: {selectedUploads.length}</h4>
              <p className="text-sm text-zinc-400">
                These items will be added to your free content section. You can manage them from the Free Content page.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddToFreeContentDialog(false)
                }}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={addToFreeContent}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              >
                Add to Free Content
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
