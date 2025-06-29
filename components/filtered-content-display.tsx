"use client"

import { useState, useEffect } from "react"
import { CreatorUploadCard } from "@/components/creator-upload-card"
import { Loader2 } from "lucide-react"

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
  creatorId: string
  contentType: "free" | "premium"
  selectedType: string
  onContentTypeDetection: (types: string[]) => void
}

export default function FilteredContentDisplay({
  creatorId,
  contentType,
  selectedType,
  onContentTypeDetection,
}: FilteredContentDisplayProps) {
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([])

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        console.log(`🔍 [FilteredContentDisplay] Fetching ${contentType} content for creator:`, creatorId)

        const endpoint =
          contentType === "free"
            ? `/api/creator/${creatorId}/free-content`
            : `/api/creator/${creatorId}/premium-content`

        const response = await fetch(endpoint)

        if (!response.ok) {
          throw new Error(`Failed to fetch ${contentType} content`)
        }

        const data = await response.json()
        console.log(`✅ [FilteredContentDisplay] Fetched ${contentType} content:`, data)

        const contentItems = data.content || data.freeContent || data.premiumContent || []
        setContent(contentItems)

        // Detect content types
        const detectedTypes = new Set<string>()

        contentItems.forEach((item: ContentItem) => {
          if (item.type) {
            detectedTypes.add(item.type)
          } else if (item.videoUrl || item.vimeoId) {
            detectedTypes.add("video")
          } else if (item.thumbnailUrl && !item.videoUrl && !item.vimeoId) {
            detectedTypes.add("image")
          } else if (item.fileUrl || item.fileName) {
            detectedTypes.add("file")
          } else {
            detectedTypes.add("other")
          }
        })

        const typesArray = Array.from(detectedTypes)
        console.log(`🔍 [FilteredContentDisplay] Detected content types:`, typesArray)
        onContentTypeDetection(typesArray)
      } catch (error) {
        console.error(`❌ [FilteredContentDisplay] Error fetching ${contentType} content:`, error)
        setContent([])
        onContentTypeDetection([])
      } finally {
        setLoading(false)
      }
    }

    if (creatorId) {
      fetchContent()
    }
  }, [creatorId, contentType, onContentTypeDetection])

  // Filter content based on selected type
  const filteredContentItems =
    selectedType === "all"
      ? content
      : content.filter((item) => {
          if (item.type) {
            return item.type === selectedType
          }
          // Fallback type detection
          if (selectedType === "video") {
            return item.videoUrl || item.vimeoId
          }
          if (selectedType === "image") {
            return item.thumbnailUrl && !item.videoUrl && !item.vimeoId
          }
          if (selectedType === "file") {
            return item.fileUrl || item.fileName
          }
          return false
        })

  useEffect(() => {
    setFilteredContent(filteredContentItems)
  }, [filteredContentItems])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (filteredContentItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">
          {selectedType === "all" ? `No ${contentType} content available` : `No ${selectedType} content available`}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {filteredContentItems.map((item) => (
        <CreatorUploadCard
          key={item.id}
          video={{
            id: item.id,
            title: item.title,
            fileUrl: item.fileUrl || item.videoUrl || "",
            thumbnailUrl: item.thumbnailUrl,
            // Add other required properties with defaults
            creatorName: "Creator",
            uid: creatorId,
            views: item.views || 0,
            downloads: item.downloads || 0,
          }}
        />
      ))}
    </div>
  )
}
