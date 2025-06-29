"use client"

import { useState, useEffect } from "react"
import { VideoCard } from "@/components/video-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ContentItem {
  id: string
  title: string
  thumbnailUrl?: string
  videoUrl?: string
  fileUrl?: string
  vimeoId?: string
  type?: string
  fileType?: string
  mimeType?: string
  duration?: number
  fileSize?: number
  createdAt?: string
}

interface FilteredContentDisplayProps {
  content: ContentItem[]
  onContentTypeDetection?: (types: string[]) => void
}

export default function FilteredContentDisplay({ content, onContentTypeDetection }: FilteredContentDisplayProps) {
  const [selectedType, setSelectedType] = useState<string>("all")
  const [contentTypes, setContentTypes] = useState<string[]>([])
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>(content)

  // Detect content types
  useEffect(() => {
    const types = new Set<string>()

    content.forEach((item) => {
      // Detect content type based on various properties
      if (item.type === "video" || item.videoUrl || item.vimeoId) {
        types.add("video")
      } else if (item.type === "image" || (item.fileType && item.fileType.startsWith("image/"))) {
        types.add("image")
      } else if (item.type === "audio" || (item.fileType && item.fileType.startsWith("audio/"))) {
        types.add("audio")
      } else if (item.type === "file" || item.fileUrl || item.fileType) {
        types.add("file")
      } else if (item.thumbnailUrl && !item.videoUrl && !item.vimeoId) {
        types.add("image")
      } else {
        types.add("other")
      }
    })

    const detectedTypes = Array.from(types)
    setContentTypes(detectedTypes)

    // Notify parent component about detected types
    if (onContentTypeDetection) {
      onContentTypeDetection(detectedTypes)
    }

    console.log("Detected content types:", detectedTypes)
  }, [content, onContentTypeDetection])

  // Filter content based on selected type
  useEffect(() => {
    if (selectedType === "all") {
      setFilteredContent(content)
    } else {
      const filtered = content.filter((item) => {
        switch (selectedType) {
          case "video":
            return item.type === "video" || item.videoUrl || item.vimeoId
          case "image":
            return (
              item.type === "image" ||
              (item.fileType && item.fileType.startsWith("image/")) ||
              (item.thumbnailUrl && !item.videoUrl && !item.vimeoId)
            )
          case "audio":
            return item.type === "audio" || (item.fileType && item.fileType.startsWith("audio/"))
          case "file":
            return (
              item.type === "file" ||
              item.fileUrl ||
              (item.fileType &&
                !item.fileType.startsWith("video/") &&
                !item.fileType.startsWith("image/") &&
                !item.fileType.startsWith("audio/"))
            )
          case "other":
            return !item.type && !item.videoUrl && !item.vimeoId && !item.fileUrl && !item.thumbnailUrl
          default:
            return true
        }
      })
      setFilteredContent(filtered)
    }
  }, [selectedType, content])

  // Show dropdown if there are multiple content types
  const showDropdown = contentTypes.length > 1

  return (
    <div>
      {/* Content Type Filter */}
      {showDropdown && (
        <div className="mb-4">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Content</SelectItem>
              {contentTypes.includes("video") && <SelectItem value="video">Videos</SelectItem>}
              {contentTypes.includes("image") && <SelectItem value="image">Images</SelectItem>}
              {contentTypes.includes("audio") && <SelectItem value="audio">Audio</SelectItem>}
              {contentTypes.includes("file") && <SelectItem value="file">Files</SelectItem>}
              {contentTypes.includes("other") && <SelectItem value="other">Other</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Content Grid */}
      {filteredContent.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filteredContent.map((item) => (
            <VideoCard
              key={item.id}
              id={item.id}
              title={item.title}
              thumbnailUrl={item.thumbnailUrl}
              videoUrl={item.videoUrl}
              vimeoId={item.vimeoId}
              duration={item.duration}
              fileSize={item.fileSize}
              createdAt={item.createdAt}
              showTitle={false}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-zinc-400">
            {selectedType === "all" ? "No content available" : `No ${selectedType} content found`}
          </p>
        </div>
      )}
    </div>
  )
}
