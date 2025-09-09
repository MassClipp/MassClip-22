"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Edit2, Trash2, Eye, Copy, Film, Music, ImageIcon, File } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

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
  folderId?: string | null
  originalName?: string
}

interface UploadCardProps {
  upload: UploadType
  viewMode: "grid" | "list"
  isSelected: boolean
  onSelect: (uploadId: string) => void
  onRename: (upload: UploadType) => void
  onDelete: (upload: UploadType) => void
  onToggleFreeContent: (upload: UploadType) => void
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

export default function UploadCard({
  upload,
  viewMode,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onToggleFreeContent,
}: UploadCardProps) {
  const [imageError, setImageError] = useState(false)

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size"
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
    } catch (error) {
      console.error("Failed to copy URL:", error)
    }
  }

  const FileIcon = FILE_TYPE_ICONS[upload.type]
  const fileTypeColor = FILE_TYPE_COLORS[upload.type]

  if (viewMode === "list") {
    return (
      <div
        className={`flex items-center gap-4 p-4 bg-zinc-900/30 border border-zinc-800/30 rounded-lg hover:bg-zinc-800/30 transition-colors ${
          isSelected ? "ring-2 ring-blue-500/50 bg-blue-500/5" : ""
        }`}
      >
        <Checkbox checked={isSelected} onCheckedChange={() => onSelect(upload.id)} className="border-zinc-600" />

        <div className="flex-shrink-0">
          {upload.type === "image" && !imageError ? (
            <img
              src={upload.fileUrl || "/placeholder.svg"}
              alt={upload.title}
              className="w-12 h-12 object-cover rounded"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center">
              <FileIcon className={`h-6 w-6 ${fileTypeColor}`} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{upload.title}</h3>
          <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
            <span className="capitalize">{upload.type}</span>
            <span>•</span>
            <span>{formatFileSize(upload.size)}</span>
            <span>•</span>
            <span>{formatDistanceToNow(upload.createdAt, { addSuffix: true })}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
            <DropdownMenuItem
              onClick={() => window.open(upload.fileUrl, "_blank")}
              className="text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800"
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => copyToClipboard(upload.fileUrl)}
              className="text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onRename(upload)}
              className="text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(upload)}
              className="text-red-400 hover:bg-red-900/20 focus:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Grid view
  return (
    <div
      className={`group relative bg-zinc-900/30 border border-zinc-800/30 rounded-lg overflow-hidden hover:bg-zinc-800/30 transition-colors ${
        isSelected ? "ring-2 ring-blue-500/50 bg-blue-500/5" : ""
      }`}
    >
      <div className="absolute top-3 left-3 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(upload.id)}
          className="border-zinc-600 bg-zinc-900/80"
        />
      </div>

      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-zinc-900/80 hover:bg-zinc-800">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
            <DropdownMenuItem
              onClick={() => window.open(upload.fileUrl, "_blank")}
              className="text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800"
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => copyToClipboard(upload.fileUrl)}
              className="text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onRename(upload)}
              className="text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(upload)}
              className="text-red-400 hover:bg-red-900/20 focus:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="aspect-video bg-zinc-800 flex items-center justify-center">
        {upload.type === "image" && !imageError ? (
          <img
            src={upload.fileUrl || "/placeholder.svg"}
            alt={upload.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : upload.type === "video" ? (
          <video
            src={upload.fileUrl}
            className="w-full h-full object-cover"
            muted
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => e.currentTarget.pause()}
          />
        ) : (
          <FileIcon className={`h-12 w-12 ${fileTypeColor}`} />
        )}
      </div>

      <div className="p-4">
        <h3 className="font-medium text-white truncate mb-2">{upload.title}</h3>
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span className="capitalize">{upload.type}</span>
          <span>{formatFileSize(upload.size)}</span>
        </div>
        <div className="text-xs text-zinc-500 mt-1">{formatDistanceToNow(upload.createdAt, { addSuffix: true })}</div>
      </div>
    </div>
  )
}
