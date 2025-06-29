"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Play, Download, ImageIcon, FileText, Calendar, Eye, ChevronDown, Grid3X3, Clock } from "lucide-react"

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

interface ContentTypeFilterProps {
  content: ContentItem[]
  onContentTypeChange?: (types: string[]) => void
}

export default function ContentTypeFilter({ content, onContentTypeChange }: ContentTypeFilterProps) {
  const [selectedType, setSelectedType] = useState<"all" | "videos" | "images" | "files">("all")
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([])
  const [availableTypes, setAvailableTypes] = useState<string[]>([])

  // Detect content types
  useEffect(() => {
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

    const typeArray = Array.from(types)
    setAvailableTypes(typeArray)
    onContentTypeChange?.(typeArray)
  }, [content, onContentTypeChange])

  // Filter content based on selected type
  useEffect(() => {
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
  }, [content, selectedType])

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

  const getDropdownIcon = () => {
    switch (selectedType) {
      case "videos":
        return <Play className="w-4 h-4" />
      case "images":
        return <ImageIcon className="w-4 h-4" />
      case "files":
        return <FileText className="w-4 h-4" />
      default:
        return <Grid3X3 className="w-4 h-4" />
    }
  }

  const getDropdownLabel = () => {
    switch (selectedType) {
      case "videos":
        return "Videos"
      case "images":
        return "Images"
      case "files":
        return "Files"
      default:
        return "All"
    }
  }

  // Video Card Component
  const VideoCard = ({ item }: { item: ContentItem }) => (
    <Card className="bg-gray-800 border-gray-700 hover:border-orange-500/50 transition-all duration-200 group cursor-pointer">
      <CardContent className="p-0">
        <div className="relative aspect-video bg-gray-900 rounded-t-lg overflow-hidden">
          <img
            src={item.thumbnailUrl || "/placeholder.svg?height=180&width=320&text=Video"}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
            <div className="bg-orange-500 rounded-full p-4 shadow-lg">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
          </div>

          {/* Duration badge */}
          {item.duration && (
            <Badge className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1">
              <Clock className="w-3 h-3 mr-1" />
              {item.duration}
            </Badge>
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

  // Image Card Component
  const ImageCard = ({ item }: { item: ContentItem }) => (
    <Card className="bg-gray-800 border-gray-700 hover:border-blue-500/50 transition-all duration-200 group cursor-pointer">
      <CardContent className="p-0">
        <div className="relative aspect-square bg-gray-900 rounded-t-lg overflow-hidden">
          <img
            src={item.thumbnailUrl || "/placeholder.svg?height=300&width=300&text=Image"}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Image overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
            <div className="bg-blue-500 rounded-full p-3 shadow-lg">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="p-3">
          <h3 className="text-white font-medium mb-2 line-clamp-2 text-sm group-hover:text-blue-500 transition-colors">
            {item.title}
          </h3>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(item.uploadDate)}
            </div>
            {item.downloadCount !== undefined && (
              <div className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {formatNumber(item.downloadCount)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // File Card Component
  const FileCard = ({ item }: { item: ContentItem }) => (
    <Card className="bg-gray-800 border-gray-700 hover:border-green-500/50 transition-all duration-200 group cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="bg-green-500/20 rounded-lg p-3 flex-shrink-0 group-hover:bg-green-500/30 transition-colors">
            <FileText className="w-8 h-8 text-green-500" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium mb-1 line-clamp-2 group-hover:text-green-500 transition-colors">
              {item.title}
            </h3>

            {item.description && <p className="text-gray-400 text-sm mb-3 line-clamp-2">{item.description}</p>}

            <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
              {item.fileType && (
                <Badge variant="outline" className="text-xs border-gray-600">
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
              <div className="flex items-center gap-1 text-sm text-gray-400">
                <Download className="w-4 h-4" />
                {formatNumber(item.downloadCount)} downloads
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderContent = () => {
    if (!filteredContent.length) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2 text-lg">No {selectedType === "all" ? "content" : selectedType} found</div>
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

  return (
    <div className="space-y-6">
      {/* Content Type Dropdown - only show if multiple types exist */}
      {availableTypes.length > 1 && (
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-gray-800 border-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white"
              >
                {getDropdownIcon()}
                <span className="text-sm">{getDropdownLabel()}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-gray-800 border-gray-700">
              <DropdownMenuItem
                onClick={() => setSelectedType("all")}
                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                All Content
              </DropdownMenuItem>
              {availableTypes.includes("videos") && (
                <DropdownMenuItem
                  onClick={() => setSelectedType("videos")}
                  className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Videos
                </DropdownMenuItem>
              )}
              {availableTypes.includes("images") && (
                <DropdownMenuItem
                  onClick={() => setSelectedType("images")}
                  className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Images
                </DropdownMenuItem>
              )}
              {availableTypes.includes("files") && (
                <DropdownMenuItem
                  onClick={() => setSelectedType("files")}
                  className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Files
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="text-sm text-gray-400">
            Showing {filteredContent.length} {selectedType === "all" ? "items" : selectedType}
          </div>
        </div>
      )}

      {/* Content Display */}
      {renderContent()}
    </div>
  )
}
