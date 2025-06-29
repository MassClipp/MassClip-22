"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Download, ImageIcon, FileText, Calendar, Eye } from "lucide-react"

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
  viewCount?: number
  description?: string
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

  const formatNumber = (num?: number) => {
    if (!num) return "0"
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  // Video-specific UI
  const VideoCard = ({ item }: { item: ContentItem }) => (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors group cursor-pointer">
      <CardContent className="p-0">
        <div className="relative aspect-video bg-gray-900 rounded-t-lg overflow-hidden">
          <img
            src={item.thumbnailUrl || "/placeholder.svg?height=180&width=320"}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />

          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <div className="bg-orange-500 rounded-full p-3">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
          </div>

          {/* Duration badge */}
          {item.duration && (
            <Badge className="absolute bottom-2 right-2 bg-black/80 text-white text-xs">{item.duration}</Badge>
          )}
        </div>

        <div className="p-4">
          <h3 className="text-white font-medium mb-2 line-clamp-2 group-hover:text-orange-500 transition-colors">
            {item.title}
          </h3>

          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center gap-4">
              {item.viewCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {formatNumber(item.viewCount)}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(item.uploadDate)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Image-specific UI
  const ImageCard = ({ item }: { item: ContentItem }) => (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors group cursor-pointer">
      <CardContent className="p-0">
        <div className="relative aspect-square bg-gray-900 rounded-t-lg overflow-hidden">
          <img
            src={item.thumbnailUrl || "/placeholder.svg?height=300&width=300"}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />

          {/* Image overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <div className="bg-blue-500 rounded-full p-3">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-white font-medium mb-2 line-clamp-2 group-hover:text-blue-500 transition-colors">
            {item.title}
          </h3>

          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(item.uploadDate)}
            </div>
            {item.downloadCount !== undefined && (
              <div className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                {formatNumber(item.downloadCount)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // File-specific UI
  const FileCard = ({ item }: { item: ContentItem }) => (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors group cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="bg-green-500/20 rounded-lg p-3 flex-shrink-0">
            <FileText className="w-8 h-8 text-green-500" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium mb-1 line-clamp-2 group-hover:text-green-500 transition-colors">
              {item.title}
            </h3>

            {item.description && <p className="text-gray-400 text-sm mb-3 line-clamp-2">{item.description}</p>}

            <div className="flex items-center gap-4 text-sm text-gray-400">
              {item.fileType && (
                <Badge variant="outline" className="text-xs">
                  {item.fileType.toUpperCase()}
                </Badge>
              )}
              {item.fileSize && <span>{formatFileSize(item.fileSize)}</span>}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(item.uploadDate)}
              </div>
            </div>

            {item.downloadCount !== undefined && (
              <div className="flex items-center gap-1 mt-2 text-sm text-gray-400">
                <Download className="w-4 h-4" />
                {formatNumber(item.downloadCount)} downloads
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

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

  // Render different layouts based on content type
  if (selectedType === "videos") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContent.map((item) => (
          <VideoCard key={item.id} item={item} />
        ))}
      </div>
    )
  }

  if (selectedType === "images") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredContent.map((item) => (
          <ImageCard key={item.id} item={item} />
        ))}
      </div>
    )
  }

  if (selectedType === "files") {
    return (
      <div className="space-y-4">
        {filteredContent.map((item) => (
          <FileCard key={item.id} item={item} />
        ))}
      </div>
    )
  }

  // Mixed content view (all)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredContent.map((item) => {
        const isVideo = item.type === "video" || item.videoUrl || item.vimeoId
        const isImage = item.type === "image" || (item.thumbnailUrl && !item.videoUrl && !item.vimeoId)
        const isFile = item.type === "file" || item.fileUrl

        if (isVideo) return <VideoCard key={item.id} item={item} />
        if (isImage) return <ImageCard key={item.id} item={item} />
        if (isFile)
          return (
            <div key={item.id} className="md:col-span-2 lg:col-span-3">
              <FileCard item={item} />
            </div>
          )

        // Fallback
        return <VideoCard key={item.id} item={item} />
      })}
    </div>
  )
}
