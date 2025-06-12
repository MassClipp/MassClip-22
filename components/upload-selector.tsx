"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, Video, Music, ImageIcon, File, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

interface Upload {
  id: string
  title: string
  filename: string
  fileUrl: string
  thumbnailUrl?: string
  mimeType: string
  fileSize: number
  duration?: number
  createdAt: any
  contentType: "video" | "audio" | "image" | "document"
}

interface UploadSelectorProps {
  excludeIds?: string[]
  onSelect: (uploadIds: string[]) => void
  onCancel: () => void
  loading?: boolean
}

export default function UploadSelector({ excludeIds = [], onSelect, onCancel, loading = false }: UploadSelectorProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [uploads, setUploads] = useState<Upload[]>([])
  const [filteredUploads, setFilteredUploads] = useState<Upload[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch uploads
  useEffect(() => {
    const fetchUploads = async () => {
      if (!user) return

      try {
        setFetchLoading(true)
        setError(null)

        console.log("🔍 [Upload Selector] Fetching uploads for user:", user.uid)

        const token = await user.getIdToken()
        // Use the correct API endpoint
        const response = await fetch("/api/creator/uploads", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch uploads`)
        }

        const data = await response.json()
        console.log("✅ [Upload Selector] Fetched uploads:", data)

        const uploadsData = Array.isArray(data.uploads) ? data.uploads : []

        // Transform uploads and determine content type
        const transformedUploads: Upload[] = uploadsData.map((upload: any) => ({
          id: upload.id,
          title: upload.title || upload.filename || upload.originalFileName || "Untitled",
          filename: upload.filename || upload.originalFileName || `${upload.id}.file`,
          fileUrl: upload.fileUrl || upload.publicUrl || upload.downloadUrl || "",
          thumbnailUrl: upload.thumbnailUrl || "",
          mimeType: upload.mimeType || upload.fileType || "application/octet-stream",
          fileSize: upload.fileSize || upload.size || 0,
          duration: upload.duration || undefined,
          createdAt: upload.createdAt || upload.uploadedAt,
          contentType: getContentType(upload.mimeType || upload.fileType || ""),
        }))

        // Filter out excluded uploads and uploads without valid URLs
        const availableUploads = transformedUploads.filter(
          (upload) => !excludeIds.includes(upload.id) && upload.fileUrl && upload.fileUrl.startsWith("http"),
        )

        setUploads(availableUploads)
        setFilteredUploads(availableUploads)
        console.log(`✅ [Upload Selector] Loaded ${availableUploads.length} available uploads`)
      } catch (err) {
        console.error("❌ [Upload Selector] Error fetching uploads:", err)

        // Try to get more detailed error information
        let errorMessage = "Failed to load uploads"
        if (err instanceof Error) {
          errorMessage = err.message
        }

        // If it's a 500 error, suggest checking the diagnostic endpoint
        if (errorMessage.includes("500") || errorMessage.includes("Internal Server Error")) {
          errorMessage = "Server error while loading uploads. Please check the console for details."

          // Optionally call the diagnostic endpoint for more info
          try {
            const diagnosticResponse = await fetch("/api/debug/uploads-diagnostic")
            const diagnosticData = await diagnosticResponse.json()
            console.log("🔍 [Upload Selector] Diagnostic data:", diagnosticData)
          } catch (diagnosticError) {
            console.log("⚠️ [Upload Selector] Could not fetch diagnostic data:", diagnosticError)
          }
        }

        setError(errorMessage)
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setFetchLoading(false)
      }
    }

    fetchUploads()
  }, [user, excludeIds, toast])

  // Determine content type from MIME type
  const getContentType = (mimeType: string): "video" | "audio" | "image" | "document" => {
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    if (mimeType.startsWith("image/")) return "image"
    return "document"
  }

  // Filter uploads based on search and type
  useEffect(() => {
    let filtered = uploads

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (upload) =>
          upload.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          upload.filename.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((upload) => upload.contentType === typeFilter)
    }

    setFilteredUploads(filtered)
  }, [uploads, searchTerm, typeFilter])

  // Handle individual selection
  const handleToggleSelection = (uploadId: string) => {
    setSelectedIds((prev) => (prev.includes(uploadId) ? prev.filter((id) => id !== uploadId) : [...prev, uploadId]))
  }

  // Handle select all
  const handleSelectAll = () => {
    setSelectedIds(filteredUploads.map((upload) => upload.id))
  }

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedIds([])
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  // Get content type icon
  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case "video":
        return <Video className="h-4 w-4" />
      case "audio":
        return <Music className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  // Handle submit
  const handleSubmit = () => {
    if (selectedIds.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one upload to add",
        variant: "destructive",
      })
      return
    }

    console.log("📤 [Upload Selector] Submitting selected uploads:", selectedIds)
    onSelect(selectedIds)
  }

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        <span className="ml-3 text-zinc-400">Loading uploads...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search uploads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-zinc-800 border-zinc-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">
          {selectedIds.length} of {filteredUploads.length} selected
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll} className="border-zinc-700">
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll} className="border-zinc-700">
            Deselect All
          </Button>
        </div>
      </div>

      {/* Upload Grid */}
      {filteredUploads.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">
            {uploads.length === 0 ? "No uploads found" : "No uploads match your search criteria"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {filteredUploads.map((upload, index) => (
            <motion.div
              key={upload.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={`relative bg-zinc-800 rounded-lg border transition-all duration-200 cursor-pointer hover:border-zinc-600 ${
                selectedIds.includes(upload.id) ? "border-red-500 bg-red-900/20" : "border-zinc-700"
              }`}
              onClick={() => handleToggleSelection(upload.id)}
            >
              {/* Checkbox */}
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={selectedIds.includes(upload.id)}
                  onChange={() => handleToggleSelection(upload.id)}
                  className="bg-zinc-900 border-zinc-600"
                />
              </div>

              {/* Thumbnail */}
              <div className="aspect-video bg-zinc-700 rounded-t-lg overflow-hidden relative">
                {upload.thumbnailUrl ? (
                  <img
                    src={upload.thumbnailUrl || "/placeholder.svg"}
                    alt={upload.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = "none"
                      target.nextElementSibling?.classList.remove("hidden")
                    }}
                  />
                ) : null}
                <div
                  className={`${upload.thumbnailUrl ? "hidden" : ""} absolute inset-0 flex items-center justify-center text-zinc-400`}
                >
                  {getContentIcon(upload.contentType)}
                </div>
              </div>

              {/* Content Info */}
              <div className="p-3">
                <h4 className="text-sm font-medium text-white truncate mb-1" title={upload.title}>
                  {upload.title}
                </h4>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-300">
                    {upload.contentType}
                  </Badge>
                  <span>{formatFileSize(upload.fileSize)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button variant="outline" onClick={onCancel} className="border-zinc-700">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || selectedIds.length === 0}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            `Add ${selectedIds.length} Upload${selectedIds.length !== 1 ? "s" : ""}`
          )}
        </Button>
      </div>
    </div>
  )
}
