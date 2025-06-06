"use client"

import { CardDescription } from "@/components/ui/card"

import type React from "react"
import { useEffect } from "react"
import { useState, useCallback, useRef } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { v4 as uuidv4 } from "uuid"
import FirestoreIndexHelper from "@/components/firestore-index-helper"
import ProfileSetup from "@/components/profile-setup"
import { VideoPreviewPlayer } from "@/components/video-preview-player"
import AudioCard from "@/components/audio-card"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

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

interface UploadProgress {
  id: string
  file: File
  progress: number
  status: "uploading" | "processing" | "completed" | "error"
  error?: string
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

const UploadsPage = () => {
  // Add this effect to hide the Debug R2 button using CSS
  useEffect(() => {
    // This will find any button containing the text "Debug R2" and hide it
    const debugButtons = document.querySelectorAll("button")
    debugButtons.forEach((button) => {
      if (button.textContent && button.textContent.includes("Debug R2")) {
        button.style.display = "none"
      }
    })
  }, [])

  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { user, loading: authLoading } = useFirebaseAuth()
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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [hasIndexError, setHasIndexError] = useState(false)
  const [hasUserProfile, setHasUserProfile] = useState<boolean | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [selectedUploads, setSelectedUploads] = useState<string[]>([])
  const [showAddToFreeContentDialog, setShowAddToFreeContentDialog] = useState(false)

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

      console.log("🔍 Fetching uploads with token:", token.substring(0, 20) + "...")

      const response = await fetch(`/api/uploads?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API Error:", response.status, errorData)

        // Handle index errors specifically
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

  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    if (!user || files.length === 0 || !hasUserProfile) return

    console.log(`🔍 [File Upload] Starting upload for ${files.length} files`)

    const newUploads: UploadProgress[] = Array.from(files).map((file) => ({
      id: uuidv4(),
      file,
      progress: 0,
      status: "uploading",
    }))

    setUploadProgress((prev) => [...prev, ...newUploads])

    for (const uploadItem of newUploads) {
      try {
        console.log(`🔍 [File Upload] Processing: ${uploadItem.file.name}`)
        console.log(`🔍 [File Upload] File details:`, {
          name: uploadItem.file.name,
          size: uploadItem.file.size,
          type: uploadItem.file.type,
        })

        // Update progress to show upload starting
        setUploadProgress((prev) => prev.map((item) => (item.id === uploadItem.id ? { ...item, progress: 10 } : item)))

        // Generate unique filename with timestamp
        const timestamp = Date.now()
        const uniqueFileName = `${timestamp}-${uploadItem.file.name}`
        console.log(`🔍 [File Upload] Generated filename: ${uniqueFileName}`)

        // Get upload URL from Cloudflare R2
        console.log(`🔍 [File Upload] Requesting upload URL...`)
        const token = await user.getIdToken()
        const uploadResponse = await fetch("/api/get-upload-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: uniqueFileName,
            fileType: uploadItem.file.type,
          }),
        })

        console.log(`🔍 [File Upload] Upload URL response status: ${uploadResponse.status}`)

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          console.error("❌ [File Upload] Failed to get upload URL:", errorData)
          throw new Error(errorData.error || "Failed to get upload URL")
        }

        const { uploadUrl, publicUrl } = await uploadResponse.json()
        console.log(`✅ [File Upload] Got upload URL and public URL: ${publicUrl}`)

        // Update progress
        setUploadProgress((prev) => prev.map((item) => (item.id === uploadItem.id ? { ...item, progress: 30 } : item)))

        // Upload file to Cloudflare R2
        console.log(`🔍 [File Upload] Uploading to R2...`)
        const putResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: uploadItem.file,
          headers: {
            "Content-Type": uploadItem.file.type,
          },
        })

        console.log(`🔍 [File Upload] R2 upload response status: ${putResponse.status}`)

        if (!putResponse.ok) {
          console.error("❌ [File Upload] R2 upload failed:", putResponse.statusText)
          throw new Error(`Failed to upload file to storage: ${putResponse.statusText}`)
        }

        console.log(`✅ [File Upload] File uploaded to R2 successfully`)

        // Update progress
        setUploadProgress((prev) =>
          prev.map((item) => (item.id === uploadItem.id ? { ...item, progress: 70, status: "processing" } : item)),
        )

        // Create upload record in database
        console.log(`🔍 [File Upload] Creating database record...`)
        const tokenForRecord = await user.getIdToken()
        const recordResponse = await fetch("/api/uploads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenForRecord}`,
          },
          body: JSON.stringify({
            fileUrl: publicUrl,
            filename: uploadItem.file.name,
            title: uploadItem.file.name.split(".")[0], // Remove extension for title
            size: uploadItem.file.size,
            mimeType: uploadItem.file.type,
          }),
        })

        console.log(`🔍 [File Upload] Database record response status: ${recordResponse.status}`)

        if (!recordResponse.ok) {
          const errorData = await recordResponse.json()
          console.error("❌ [File Upload] Failed to create database record:", errorData)
          throw new Error(errorData.error || "Failed to create upload record")
        }

        const recordData = await recordResponse.json()
        console.log(`✅ [File Upload] Database record created:`, recordData)

        // Complete upload
        setUploadProgress((prev) =>
          prev.map((item) => (item.id === uploadItem.id ? { ...item, progress: 100, status: "completed" } : item)),
        )

        // Refresh uploads
        queryClient.invalidateQueries({ queryKey: ["uploads"] })

        toast({
          title: "Upload Complete",
          description: `${uploadItem.file.name} uploaded successfully`,
        })
      } catch (error: any) {
        console.error("❌ [File Upload] Upload failed:", error)
        setUploadProgress((prev) =>
          prev.map((item) =>
            item.id === uploadItem.id ? { ...item, status: "error", error: error.message || "Upload failed" } : item,
          ),
        )
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${uploadItem.file.name}: ${error.message || "Unknown error"}`,
          variant: "destructive",
        })
      }
    }
  }

  // Handle file selection from input
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFileUpload(event.target.files)
      // Clear the input value so the same file can be uploaded again
      event.target.value = ""
    }
  }

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Handle drag and drop
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.dataTransfer.files) {
      handleFileUpload(event.dataTransfer.files)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  // Delete upload
  const deleteUpload = async (id: string) => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/uploads/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Failed to delete upload:", errorData)
        throw new Error(errorData.error || "Failed to delete upload")
      }

      setUploads((prev) => prev.filter((upload) => upload.id !== id))
      setSelectedUpload(null)
      toast({
        title: "Upload Deleted",
        description: "Upload deleted successfully",
      })
    } catch (error: any) {
      console.error("Error deleting upload:", error)
      toast({
        title: "Error Deleting Upload",
        description: error.message || "Failed to delete upload",
        variant: "destructive",
      })
    }
  }

  // Rename upload
  const renameUpload = async () => {
    if (!user || !selectedUpload) return

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
        const errorData = await response.json()
        console.error("Failed to rename upload:", errorData)
        throw new Error(errorData.error || "Failed to rename upload")
      }

      setUploads((prev) =>
        prev.map((upload) => (upload.id === selectedUpload.id ? { ...upload, title: newTitle } : upload)),
      )
      setSelectedUpload((prev) => (prev ? { ...prev, title: newTitle } : null))
      setIsRenameDialogOpen(false)
      toast({
        title: "Upload Renamed",
        description: "Upload renamed successfully",
      })
    } catch (error: any) {
      console.error("Error renaming upload:", error)
      toast({
        title: "Error Renaming Upload",
        description: error.message || "Failed to rename upload",
        variant: "destructive",
      })
    }
  }

  // Filtered uploads
  const filteredUploads = uploads.filter((upload) => {
    const searchTermLower = searchTerm.toLowerCase()
    const titleLower = upload.title.toLowerCase()

    const matchesSearchTerm =
      titleLower.includes(searchTermLower) || upload.filename.toLowerCase().includes(searchTermLower)
    const matchesFilterType = filterType === "all" || upload.type === filterType

    return matchesSearchTerm && matchesFilterType
  })

  const handleAddToFreeContent = async () => {
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
        console.error("Failed to add to free content:", errorData)
        throw new Error(errorData.error || "Failed to add to free content")
      }

      setShowAddToFreeContentDialog(false)
      setSelectedUploads([])
      toast({
        title: "Added to Free Content",
        description: "Selected uploads added to free content successfully",
      })
    } catch (error: any) {
      console.error("Error adding to free content:", error)
      toast({
        title: "Error Adding to Free Content",
        description: error.message || "Failed to add to free content",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container relative pb-10">
      {!hasUserProfile && !authLoading ? (
        <ProfileSetup username={username} setUsername={setUsername} setHasUserProfile={setHasUserProfile} />
      ) : null}

      {hasIndexError && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-red-500">Database Setup Required</CardTitle>
            <CardDescription>Firestore indexes need to be created.</CardDescription>
          </CardHeader>
          <CardContent>
            <FirestoreIndexHelper />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">Your Uploads</h1>
          <Badge variant="secondary">{uploads.length}</Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Search uploads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => fetchUploads()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={triggerFileInput}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="video/*, audio/*, image/*, application/pdf, text/*"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
            {viewMode === "grid" ? (
              <>
                <List className="mr-2 h-4 w-4" />
                List View
              </>
            ) : (
              <>
                <Grid3X3 className="mr-2 h-4 w-4" />
                Grid View
              </>
            )}
          </Button>

          {selectedUploads.length > 0 && (
            <Button variant="destructive" onClick={() => setShowAddToFreeContentDialog(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add to Free Content ({selectedUploads.length})
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showAddToFreeContentDialog} onOpenChange={setShowAddToFreeContentDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add to Free Content</DialogTitle>
            <DialogDescription>Are you sure you want to add these uploads to free content?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p>You are about to add {selectedUploads.length} uploads to free content.</p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setShowAddToFreeContentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddToFreeContent}>Add to Free Content</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div
        className="border-dashed border-2 border-gray-400 rounded-md p-4 text-center cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={triggerFileInput}
      >
        Drag and drop files here or click to select
      </div>

      {uploadProgress.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Uploading...</h2>
          {uploadProgress.map((uploadItem) => (
            <Card key={uploadItem.id} className="mb-2">
              <CardHeader>
                <CardTitle>{uploadItem.file.name}</CardTitle>
                <CardDescription>
                  Status: {uploadItem.status} {uploadItem.error && ` - Error: ${uploadItem.error}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={uploadItem.progress} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Loading uploads...
        </div>
      ) : filteredUploads.length === 0 ? (
        <div className="text-center mt-8">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p className="text-gray-500">No uploads found.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredUploads.map((upload) => (
            <motion.div
              key={upload.id}
              className="relative"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="hover:shadow-md transition-shadow duration-200">
                <div className="relative">
                  {upload.type === "video" ? (
                    <VideoPreviewPlayer fileUrl={upload.fileUrl} />
                  ) : upload.type === "audio" ? (
                    <AudioCard fileUrl={upload.fileUrl} />
                  ) : upload.type === "image" ? (
                    <img src={upload.fileUrl} alt={upload.title} className="w-full h-32 object-cover rounded-md" />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center bg-gray-100 rounded-md">
                      <File className="h-12 w-12 text-gray-500" />
                    </div>
                  )}
                  <Badge
                    className="absolute top-2 right-2"
                    variant={selectedUploads.includes(upload.id) ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedUploads((prev) =>
                        prev.includes(upload.id) ? prev.filter((id) => id !== upload.id) : [...prev, upload.id],
                      )
                    }}
                  >
                    {selectedUploads.includes(upload.id) ? "Selected" : "Select"}
                  </Badge>
                </div>
                <CardHeader className="p-2">
                  <CardTitle className="text-sm font-medium truncate">{upload.title}</CardTitle>
                  <CardContent className="text-xs text-gray-500 truncate">{upload.filename}</CardContent>
                </CardHeader>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="absolute top-2 left-2 h-6 w-6 p-0">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => window.open(upload.fileUrl, "_blank")}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(upload.fileUrl)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy URL
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedUpload(upload)
                        setNewTitle(upload.title)
                        setIsRenameDialogOpen(true)
                      }}
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteUpload(upload.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Filename
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUploads.map((upload) => {
                const Icon = FILE_TYPE_ICONS[upload.type] || FILE_TYPE_ICONS.other
                const colorClass = FILE_TYPE_COLORS[upload.type] || FILE_TYPE_COLORS.other
                return (
                  <tr key={upload.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{upload.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{upload.filename}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        <Icon className={`h-4 w-4 mr-1 inline-block ${colorClass}`} />
                        {upload.type}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{(upload.size! / 1024).toFixed(2)} KB</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDistanceToNow(upload.createdAt, { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-6 w-6 p-0">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(upload.fileUrl, "_blank")}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(upload.fileUrl)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy URL
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUpload(upload)
                              setNewTitle(upload.title)
                              setIsRenameDialogOpen(true)
                            }}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteUpload(upload.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Upload</DialogTitle>
            <DialogDescription>Enter a new title for the upload.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right">
                Title
              </label>
              <Input id="name" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={renameUpload}>Rename</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UploadsPage
