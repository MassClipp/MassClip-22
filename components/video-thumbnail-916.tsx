"use client"

import { Play, Download, Music, File, ImageIcon, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface VideoThumbnail916Props {
  title: string
  videoUrl: string
  thumbnailUrl?: string
  fileSize?: number
  duration?: number
  contentType: "video" | "audio" | "image" | "document" | string
  onClick?: () => void
  className?: string
}

export function VideoThumbnail916({
  title,
  videoUrl,
  thumbnailUrl,
  fileSize,
  duration,
  contentType,
  onClick,
  className = "",
}: VideoThumbnail916Props) {
  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ""
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  // Format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return ""
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <div
      className={`aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden relative group cursor-pointer ${className}`}
      onClick={onClick}
    >
      {/* Thumbnail or Preview */}
      {contentType === "video" ? (
        <div className="w-full h-full">
          <video
            src={videoUrl}
            poster={thumbnailUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            onMouseOver={(e) => e.currentTarget.play()}
            onMouseOut={(e) => {
              e.currentTarget.pause()
              e.currentTarget.currentTime = 0
            }}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Play className="h-12 w-12 text-white" />
          </div>
        </div>
      ) : contentType === "audio" ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-4">
          <Music className="h-12 w-12 text-purple-400 mb-2" />
          <h4 className="text-sm font-medium text-white text-center line-clamp-2">{title}</h4>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Play className="h-12 w-12 text-white" />
          </div>
        </div>
      ) : contentType === "image" ? (
        <div className="w-full h-full">
          <img
            src={videoUrl || thumbnailUrl || "/placeholder.svg"}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <ImageIcon className="h-12 w-12 text-white" />
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 p-4">
          <File className="h-12 w-12 text-zinc-400 mb-2" />
          <h4 className="text-sm font-medium text-white text-center line-clamp-2">{title}</h4>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Download className="h-12 w-12 text-white" />
          </div>
        </div>
      )}

      {/* Content Type Badge */}
      <div className="absolute top-2 left-2">
        <Badge
          variant="secondary"
          className={`text-xs border-0 ${
            contentType === "video"
              ? "bg-red-600/80 text-white"
              : contentType === "audio"
                ? "bg-purple-600/80 text-white"
                : contentType === "image"
                  ? "bg-blue-600/80 text-white"
                  : "bg-zinc-600/80 text-white"
          }`}
        >
          {typeof contentType === "string" ? contentType.toUpperCase() : "FILE"}
        </Badge>
      </div>

      {/* Duration Badge */}
      {duration && (
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="text-xs border-zinc-600 bg-black/50 text-white">
            <Clock className="h-3 w-3 mr-1" />
            {formatDuration(duration)}
          </Badge>
        </div>
      )}

      {/* File Size */}
      {fileSize && fileSize > 0 && (
        <div className="absolute bottom-2 right-2">
          <Badge variant="outline" className="text-xs border-zinc-600 bg-black/50 text-white">
            {formatFileSize(fileSize)}
          </Badge>
        </div>
      )}
    </div>
  )
}
