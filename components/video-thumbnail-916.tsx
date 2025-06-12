"use client"

import { useState } from "react"
import { Play, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface VideoThumbnail916Props {
  title: string
  videoUrl: string
  thumbnailUrl?: string
  fileSize?: number
  duration?: number
  contentType?: string
  onClick?: () => void
  className?: string
}

export function VideoThumbnail916({
  title,
  videoUrl,
  thumbnailUrl,
  fileSize,
  duration,
  contentType = "video",
  onClick,
  className = "",
}: VideoThumbnail916Props) {
  const [imageError, setImageError] = useState(false)
  const [videoError, setVideoError] = useState(false)

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ""
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <div
      className={`relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden group cursor-pointer hover:ring-2 hover:ring-red-500/50 transition-all duration-200 ${className}`}
      onClick={onClick}
    >
      {/* Video Background */}
      {!videoError && videoUrl && (
        <video
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          preload="metadata"
          poster={thumbnailUrl}
          onError={() => setVideoError(true)}
        />
      )}

      {/* Fallback Thumbnail */}
      {(videoError || !videoUrl) && thumbnailUrl && !imageError && (
        <img
          src={thumbnailUrl || "/placeholder.svg"}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )}

      {/* Fallback Background */}
      {(videoError || !videoUrl) && (imageError || !thumbnailUrl) && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">🎬</div>
            <p className="text-zinc-500 text-xs px-2 text-center line-clamp-2">{title}</p>
          </div>
        </div>
      )}

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Content Type Badge */}
      <div className="absolute top-2 left-2">
        <Badge
          variant="secondary"
          className={`text-xs border-0 backdrop-blur-sm ${
            contentType === "video"
              ? "bg-red-600/80 text-white"
              : contentType === "audio"
                ? "bg-purple-600/80 text-white"
                : "bg-black/60 text-white"
          }`}
        >
          {contentType.toUpperCase()}
        </Badge>
      </div>

      {/* Duration Badge */}
      {duration && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-black/60 text-white border-0 backdrop-blur-sm text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {formatDuration(duration)}
          </Badge>
        </div>
      )}

      {/* Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
          <Play className="w-6 h-6 text-white fill-white" />
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h4 className="text-white font-medium text-sm line-clamp-2 mb-1">{title}</h4>
        {fileSize && <p className="text-white/70 text-xs">{formatFileSize(fileSize)}</p>}
      </div>
    </div>
  )
}

export default VideoThumbnail916
