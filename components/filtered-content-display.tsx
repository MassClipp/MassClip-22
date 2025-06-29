"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Download, Eye, Clock, FileText, ImageIcon } from "lucide-react"

interface ContentItem {
  id: string
  title: string
  type?: string
  videoUrl?: string
  vimeoId?: string
  thumbnailUrl?: string
  fileUrl?: string
  fileName?: string
  fileSize?: string
  duration?: string
  views?: number
  downloads?: number
  createdAt?: string
}

interface FilteredContentDisplayProps {
  content: ContentItem[]
  selectedType: "all" | "videos" | "images" | "files"
  onContentTypeDetection: (types: string[]) => void
}

export default function FilteredContentDisplay({
  content,
  selectedType,
  onContentTypeDetection,
}: FilteredContentDisplayProps) {
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([])

  // Detect content types and filter content
  useEffect(() => {
    if (!content || content.length === 0) {
      onContentTypeDetection([])
      setFilteredContent([])
      return
    }

    // Detect available content types
    const detectedTypes = new Set<string>()

    content.forEach((item) => {
      // Check if it's a video
      if (item.type === "video" || item.videoUrl || item.vimeoId) {
        detectedTypes.add("videos")
      }
      // Check if it's an image
      else if (item.type === "image" || (item.thumbnailUrl && !item.videoUrl && !item.vimeoId)) {
        detectedTypes.add("images")
      }
      // Check if it's a file
      else if (item.type === "file" || item.fileUrl || item.fileName) {
        detectedTypes.add("files")
      }
      // Default to videos if unclear but has thumbnail
      else if (item.thumbnailUrl) {
        detectedTypes.add("videos")
      }
    })

    const typesArray = Array.from(detectedTypes)
    onContentTypeDetection(typesArray)

    // Filter content based on selected type
    let filtered = content
    if (selectedType !== "all") {
      filtered = content.filter((item) => {
        switch (selectedType) {
          case "videos":
            return (
              item.type === "video" ||
              item.videoUrl ||
              item.vimeoId ||
              (item.thumbnailUrl && !item.fileUrl && !item.fileName)
            )
          case "images":
            return item.type === "image" || (item.thumbnailUrl && !item.videoUrl && !item.vimeoId && !item.fileUrl)
          case "files":
            return item.type === "file" || item.fileUrl || item.fileName
          default:
            return true
        }
      })
    }

    setFilteredContent(filtered)
  }, [content, selectedType, onContentTypeDetection])

  const formatFileSize = (bytes: string | number) => {
    if (!bytes) return "Unknown size"
    const size = typeof bytes === "string" ? Number.parseInt(bytes) : bytes
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const formatDuration = (duration: string) => {
    if (!duration) return ""
    // Assume duration is in seconds
    const seconds = Number.parseInt(duration)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (!content || content.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No content available</p>
      </div>
    )
  }

  if (filteredContent.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No {selectedType === "all" ? "" : selectedType} found</p>
      </div>
    )
  }

  // Render different layouts based on content type
  if (selectedType === "files") {
    return (
      <div className="space-y-3">
        {filteredContent.map((item) => (
          <Card key={item.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-700 rounded">
                    <FileText className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{item.title || item.fileName}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      {item.fileSize && <span>{formatFileSize(item.fileSize)}</span>}
                      {item.downloads && (
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {item.downloads}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                  File
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Grid layout for videos and images
  const gridCols = selectedType === "images" ? "grid-cols-4" : "grid-cols-3"

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {filteredContent.map((item) => (
        <Card key={item.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors group">
          <CardContent className="p-0">
            <div className="relative aspect-video bg-gray-900 rounded-t-lg overflow-hidden">
              {item.thumbnailUrl && (
                <img
                  src={item.thumbnailUrl || "/placeholder.svg"}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Video overlay */}
              {(selectedType === "videos" || selectedType === "all") &&
                (item.type === "video" || item.videoUrl || item.vimeoId) && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-3 bg-orange-500 rounded-full">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>
                )}

              {/* Image overlay */}
              {selectedType === "images" && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-3 bg-green-500 rounded-full">
                    <ImageIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}

              {/* Duration badge for videos */}
              {item.duration && (
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {formatDuration(item.duration)}
                </div>
              )}

              {/* Content type badge */}
              <div className="absolute top-2 left-2">
                {(item.type === "video" || item.videoUrl || item.vimeoId) && (
                  <Badge variant="secondary" className="bg-red-500/80 text-white">
                    Video
                  </Badge>
                )}
                {item.type === "image" && (
                  <Badge variant="secondary" className="bg-green-500/80 text-white">
                    Image
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-3">
              <h3 className="text-white font-medium text-sm line-clamp-2 mb-2">{item.title}</h3>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-3">
                  {item.views && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.views}
                    </span>
                  )}
                  {item.downloads && (
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {item.downloads}
                    </span>
                  )}
                </div>
                {item.createdAt && <span>{new Date(item.createdAt).toLocaleDateString()}</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
