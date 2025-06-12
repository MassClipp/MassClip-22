"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FileText, Download, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { AutoplayVideoPlayer } from "./autoplay-video-player"
import { AudioPlayer } from "./audio-player"

interface ContentItem {
  id: string
  title: string
  fileUrl: string
  thumbnailUrl?: string
  mimeType: string
  fileSize?: number
  contentType?: "video" | "audio" | "image" | "document" | string
  duration?: number
  filename?: string
  description?: string
}

interface ProductBoxContentViewerProps {
  productBoxId: string
  contentItems: ContentItem[]
  className?: string
}

export default function ProductBoxContentViewer({
  productBoxId,
  contentItems,
  className = "",
}: ProductBoxContentViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const currentItem = contentItems[currentIndex]

  // Determine content type from MIME type if not provided
  const getContentType = (item: ContentItem): "video" | "audio" | "image" | "document" => {
    if (item.contentType) return item.contentType as any

    const mimeType = item.mimeType?.toLowerCase() || ""
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    if (mimeType.startsWith("image/")) return "image"
    return "document"
  }

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown size"
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  // Navigate between content items
  const goToNext = () => {
    if (currentIndex < contentItems.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // Handle download
  const handleDownload = async () => {
    if (!currentItem) return

    setIsLoading(true)

    try {
      // Create a temporary anchor element
      const link = document.createElement("a")
      link.href = currentItem.fileUrl
      link.download = currentItem.filename || currentItem.title || "download"
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Download started",
        description: `Downloading ${currentItem.title || "file"}`,
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download failed",
        description: "There was an error starting your download",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Render content based on type
  const renderContent = () => {
    if (!currentItem) return null

    const contentType = getContentType(currentItem)

    switch (contentType) {
      case "video":
        return (
          <AutoplayVideoPlayer
            title={currentItem.title}
            videoUrl={currentItem.fileUrl}
            thumbnailUrl={currentItem.thumbnailUrl}
            autoplay={true}
            muted={true}
            className="aspect-video w-full"
          />
        )
      case "audio":
        return (
          <AudioPlayer
            title={currentItem.title}
            audioUrl={currentItem.fileUrl}
            thumbnailUrl={currentItem.thumbnailUrl}
            autoplay={false}
          />
        )
      case "image":
        return (
          <div className="relative aspect-video flex items-center justify-center bg-black/10 rounded-lg overflow-hidden">
            <img
              src={currentItem.fileUrl || "/placeholder.svg"}
              alt={currentItem.title}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )
      case "document":
      default:
        return (
          <div className="aspect-video flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-8 text-center">
            <FileText className="h-16 w-16 text-zinc-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">{currentItem.title}</h3>
            <p className="text-sm text-zinc-500 mb-4">{currentItem.description || "Document file"}</p>
            <Button onClick={handleDownload} disabled={isLoading}>
              {isLoading ? "Downloading..." : "Download Document"}
            </Button>
          </div>
        )
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Content viewer */}
      <div className="relative">
        {/* Navigation arrows */}
        {contentItems.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 rounded-full h-10 w-10"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 rounded-full h-10 w-10"
              onClick={goToNext}
              disabled={currentIndex === contentItems.length - 1}
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </Button>
          </>
        )}

        {/* Content display */}
        <motion.div
          key={currentItem?.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </div>

      {/* Content info and controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
        <div>
          <h2 className="text-lg font-medium">{currentItem?.title}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {getContentType(currentItem)}
            </Badge>
            {currentItem?.fileSize && (
              <span className="text-xs text-zinc-500">{formatFileSize(currentItem.fileSize)}</span>
            )}
            {currentItem?.duration && (
              <span className="text-xs text-zinc-500">
                {Math.floor(currentItem.duration / 60)}:{(currentItem.duration % 60).toString().padStart(2, "0")}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(currentItem?.fileUrl, "_blank")}
            className="flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open</span>
          </Button>
        </div>
      </div>

      {/* Content navigation (for multiple items) */}
      {contentItems.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {contentItems.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentIndex ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to item ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
