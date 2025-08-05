"use client"

import { useState } from "react"
import { Download, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

interface BundleContentVideoCardProps {
  item: {
    id: string
    title: string
    displayTitle: string
    filename: string
    fileUrl: string
    downloadUrl: string
    thumbnailUrl?: string
    fileSize: number
    fileSizeFormatted: string
    duration: number
    durationFormatted: string
    mimeType: string
    quality?: string
  }
}

export function BundleContentVideoCard({ item }: BundleContentVideoCardProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!item.downloadUrl && !item.fileUrl) {
      toast({
        title: "Download Error",
        description: "No download URL available for this content.",
        variant: "destructive",
      })
      return
    }

    setIsDownloading(true)

    try {
      const downloadUrl = item.downloadUrl || item.fileUrl

      // Create a temporary anchor element to trigger download
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = item.filename || item.title || "download"
      link.target = "_blank"

      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Download Started",
        description: `Downloading ${item.title}...`,
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download Error",
        description: "Failed to start download. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Card className="group relative overflow-hidden bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all duration-200">
      {/* Video Thumbnail/Preview */}
      <div className="relative aspect-video bg-zinc-800">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-12 h-12 text-zinc-600" />
          </div>
        )}

        {/* Duration Badge */}
        {item.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {item.durationFormatted}
          </div>
        )}

        {/* Quality Badge */}
        {item.quality && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">{item.quality}</div>
        )}

        {/* Download Button - Bottom Right */}
        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          size="sm"
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-green-600 hover:bg-green-700 text-white"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* Content Info */}
      <div className="p-4">
        <h3 className="font-medium text-white truncate mb-1">{item.displayTitle || item.title}</h3>

        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>{item.fileSizeFormatted}</span>
          <span className="text-xs bg-zinc-800 px-2 py-1 rounded">
            {item.mimeType?.split("/")[1]?.toUpperCase() || "VIDEO"}
          </span>
        </div>
      </div>
    </Card>
  )
}
