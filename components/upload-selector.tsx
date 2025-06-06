"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Search, Check, Video, ImageIcon, FileText, Music } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface Upload {
  id: string
  title: string
  fileUrl: string
  type: string
  size?: number
  mimeType?: string
  createdAt?: string
}

interface UploadSelectorProps {
  excludeIds?: string[]
  onSelect: (selectedIds: string[]) => void
  onCancel: () => void
  loading?: boolean
}

export default function UploadSelector({
  excludeIds = [],
  onSelect,
  onCancel,
  loading: externalLoading,
}: UploadSelectorProps) {
  const { user } = useFirebaseAuth()
  const [uploads, setUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Fetch uploads
  useEffect(() => {
    const fetchUploads = async () => {
      if (!user) return

      try {
        setLoading(true)
        setError(null)

        const token = await user.getIdToken()
        const response = await fetch(`/api/uploads?type=${typeFilter}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch uploads: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        // Filter out excluded IDs
        const filteredUploads = data.uploads.filter((upload: Upload) => !excludeIds.includes(upload.id))

        setUploads(filteredUploads)
      } catch (error) {
        console.error("Error fetching uploads:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch uploads")
      } finally {
        setLoading(false)
      }
    }

    fetchUploads()
  }, [user, typeFilter, excludeIds])

  // Toggle selection of an upload
  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Select all visible uploads
  const selectAll = () => {
    const filteredUploads = uploads.filter((upload) => upload.title.toLowerCase().includes(searchTerm.toLowerCase()))
    setSelectedIds(filteredUploads.map((upload) => upload.id))
  }

  // Deselect all uploads
  const deselectAll = () => {
    setSelectedIds([])
  }

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size"

    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  // Get icon for file type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "audio":
        return <Music className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Filter uploads based on search term
  const filteredUploads = uploads.filter((upload) => upload.title.toLowerCase().includes(searchTerm.toLowerCase()))

  if (loading || externalLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mb-4" />
        <p className="text-zinc-400">Loading uploads...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-red-500 mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-white mb-2">Error Loading Uploads</h3>
        <p className="text-zinc-400 text-center mb-4">{error}</p>
        <Button variant="outline" onClick={onCancel}>
          Close
        </Button>
      </div>
    )
  }

  if (uploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Uploads Found</h3>
        <p className="text-zinc-400 text-center mb-6">
          You don't have any uploads yet, or all your uploads are already in your free content.
        </p>
        <Button variant="outline" onClick={onCancel}>
          Close
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
          <Input
            placeholder="Search uploads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-800 border-zinc-700"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white"
        >
          <option value="all">All Types</option>
          <option value="video">Videos</option>
          <option value="image">Images</option>
          <option value="audio">Audio</option>
          <option value="document">Documents</option>
        </select>
      </div>

      {/* Selection controls */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-zinc-400">
          {selectedIds.length} of {filteredUploads.length} selected
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll} className="border-zinc-700 hover:bg-zinc-800">
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll} className="border-zinc-700 hover:bg-zinc-800">
            Deselect All
          </Button>
        </div>
      </div>

      {/* Uploads grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto p-1">
        {filteredUploads.map((upload) => (
          <div
            key={upload.id}
            className={`relative border rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
              selectedIds.includes(upload.id)
                ? "border-red-500 bg-red-500/10"
                : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
            }`}
            onClick={() => toggleSelection(upload.id)}
          >
            {/* Selection indicator */}
            {selectedIds.includes(upload.id) && (
              <div className="absolute top-2 right-2 z-10 bg-red-500 rounded-full p-1">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}

            {/* Thumbnail */}
            <div className="aspect-video bg-zinc-900 relative">
              {/* Audio preview */}
              {upload.type === "audio" ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-2">
                  <Music className="h-8 w-8 text-zinc-500 mb-2" />
                  <audio controls className="w-full max-w-[120px]" preload="metadata">
                    <source src={upload.fileUrl} type={upload.mimeType || "audio/mpeg"} />
                  </audio>
                </div>
              ) : upload.type === "image" ? (
                <img
                  src={upload.fileUrl || "/placeholder.svg"}
                  alt={upload.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">{getTypeIcon(upload.type)}</div>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <h3 className="font-medium text-white text-sm truncate">{upload.title}</h3>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  {getTypeIcon(upload.type)}
                  {upload.type}
                </span>
                <span className="text-xs text-zinc-500">{formatFileSize(upload.size)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button variant="outline" onClick={onCancel} className="border-zinc-700 hover:bg-zinc-800">
          Cancel
        </Button>
        <Button
          onClick={() => onSelect(selectedIds)}
          disabled={selectedIds.length === 0}
          className={`${
            selectedIds.length === 0
              ? "bg-zinc-700 text-zinc-300 cursor-not-allowed"
              : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          }`}
        >
          Add {selectedIds.length} {selectedIds.length === 1 ? "Item" : "Items"}
        </Button>
      </div>
    </div>
  )
}
