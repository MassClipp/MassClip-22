"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Download, ImageIcon, FileText, Calendar } from "lucide-react"

interface ContentItem {
  id: string
  title: string
  type?: string
  thumbnailUrl?: string
  videoUrl?: string
  vimeoId?: string
  fileUrl?: string
  fileType?: string
  fileSize?: number
  duration?: string
  uploadDate?: string
  downloadCount?: number
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

  useEffect(() => {
    // Detect content types and notify parent
    const types = new Set<string>()
    content?.forEach((item) => {
      if (item.type === "video" || item.videoUrl || item.vimeoId) {
        types.add("videos")
      } else if (item.type === "image" || (item.thumbnailUrl && !item.videoUrl && !item.vimeoId)) {
        types.add("images")
      } else if (item.type === "file" || item.fileUrl) {
        types.add("files")
      }
    })
    onContentTypeDetection(Array.from(types))

    // Filter content based on selected type
    if (selectedType === "all") {
      setFilteredContent(content || [])
    } else {
      const filtered =
        content?.filter((item) => {
          switch (selectedType) {
            case "videos":
              return item.type === "video" || item.videoUrl || item.vimeoId
            case "images":
              return item.type === "image" || (item.thumbnailUrl && !item.videoUrl && !item.vimeoId)
            case "files":
              return item.type === "file" || item.fileUrl
            default:
              return true
          }
        }) || []
      setFilteredContent(filtered)
    }
  }, [content, selectedType, onContentTypeDetection])

  const getContentTypeIcon = (item: ContentItem) => {
    if (item.type === "video" || item.videoUrl || item.vimeoId) {
      return <Play className="w-5 h-5 text-orange-500" />
    } else if (item.type === "image" || (item.thumbnailUrl && !item.videoUrl && !item.vimeoId)) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />
    } else if (item.type === "file" || item.fileUrl) {
      return <FileText className="w-5 h-5 text-green-500" />
    }
    return <FileText className="w-5 h-5 text-gray-500" />
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ""
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return ""
    }
  }

  if (!filteredContent.length) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">No {selectedType === "all" ? "content" : selectedType} found</div>
        <p className="text-sm text-gray-500">
          {selectedType === "all"
            ? "This creator hasn't uploaded any content yet."
            : `This creator hasn't uploaded any ${selectedType} yet.`}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredContent.map((item) => (
        <Card key={item.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
          <CardContent className="p-0">
            {/* Thumbnail/Preview */}
            <div className="relative aspect-video bg-gray-900 rounded-t-lg overflow-hidden">
              {item.thumbnailUrl && (
                <img
                  src={item.thumbnailUrl || "/placeholder.svg"}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Content Type Overlay */}
              <div className="absolute top-2 left-2">{getContentTypeIcon(item)}</div>

              {/* Duration Badge for Videos */}
              {item.duration && (
                <Badge className="absolute bottom-2 right-2 bg-black/80 text-white">{item.duration}</Badge>
              )}

              {/* File Size Badge for Files */}
              {item.fileSize && (
                <Badge className="absolute bottom-2 right-2 bg-black/80 text-white">
                  {formatFileSize(item.fileSize)}
                </Badge>
              )}
            </div>

            {/* Content Info */}
            <div className="p-4">
              <h3 className="text-white font-medium mb-2 line-clamp-2">{item.title}</h3>

              <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(item.uploadDate)}
                </div>

                {item.downloadCount !== undefined && (
                  <div className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    {item.downloadCount}
                  </div>
                )}
              </div>

              {/* File Type Badge */}
              {item.fileType && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {item.fileType.toUpperCase()}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
