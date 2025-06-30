"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Play, Pause, Download, Music, File } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface VideoThumbnail916Props {
  title: string
  videoUrl: string
  thumbnailUrl?: string
  fileSize: number
  duration?: number
  contentType: "video" | "audio" | "image" | "document"
  onClick?: () => void
  onVideoPause?: () => void
  isPlaying?: boolean
  videoId?: string
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
  onVideoPause,
  isPlaying = false,
  videoId,
  className = "",
}: VideoThumbnail916Props) {
  const [isHovered, setIsHovered] = useState(false)
  const [thumbnailGenerated, setThumbnailGenerated] = useState(false)
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string>("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  // Format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return ""
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Generate thumbnail from video
  const generateThumbnail = () => {
    if (!videoRef.current || !canvasRef.current || thumbnailGenerated) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    const generateFrame = () => {
      try {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth || 360
        canvas.height = video.videoHeight || 640

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Convert to data URL
        const dataURL = canvas.toDataURL("image/jpeg", 0.8)
        setGeneratedThumbnail(dataURL)
        setThumbnailGenerated(true)

        console.log(`✅ Generated thumbnail for video: ${title}`)
      } catch (error) {
        console.error("Error generating thumbnail:", error)
      }
    }

    // Set up video for thumbnail generation
    video.currentTime = Math.min(video.duration * 0.1, 2) // 10% into video or 2 seconds
    video.addEventListener("seeked", generateFrame, { once: true })
  }

  // Handle video load
  const handleVideoLoad = () => {
    if (contentType === "video" && !thumbnailUrl && !thumbnailGenerated) {
      generateThumbnail()
    }
  }

  // Handle click
  const handleClick = () => {
    if (contentType === "video" && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        onVideoPause?.()
      } else {
        onClick?.()
      }
    } else {
      onClick?.()
    }
  }

  // Handle video pause
  const handleVideoPause = () => {
    onVideoPause?.()
  }

  // Handle download
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = document.createElement("a")
    link.href = videoUrl
    link.download = title
    link.click()
  }

  // Get display thumbnail
  const displayThumbnail = thumbnailUrl || generatedThumbnail

  return (
    <div
      className={`relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden cursor-pointer group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Hidden video for thumbnail generation */}
      {contentType === "video" && (
        <>
          <video
            ref={videoRef}
            className="hidden"
            preload="metadata"
            onLoadedData={handleVideoLoad}
            onPause={handleVideoPause}
            data-video-id={videoId}
            crossOrigin="anonymous"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}

      {/* Content Display */}
      {contentType === "video" ? (
        <>
          {/* Thumbnail Image */}
          {displayThumbnail ? (
            <img
              src={displayThumbnail || "/placeholder.svg"}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <div className="text-zinc-500">Loading...</div>
            </div>
          )}

          {/* Video Player (only when playing) */}
          {isPlaying && (
            <video
              className="absolute inset-0 w-full h-full object-cover z-10"
              autoPlay
              controls
              preload="metadata"
              onPause={handleVideoPause}
              data-video-id={videoId}
            >
              <source src={videoUrl} type="video/mp4" />
            </video>
          )}
        </>
      ) : contentType === "audio" ? (
        <div className="w-full h-full bg-purple-900/20 flex items-center justify-center">
          <Music className="h-12 w-12 text-purple-400" />
        </div>
      ) : contentType === "image" ? (
        <img src={videoUrl || "/placeholder.svg"} alt={title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
          <File className="h-12 w-12 text-zinc-400" />
        </div>
      )}

      {/* Content Type Badge */}
      <div className="absolute top-2 left-2 z-20">
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
          {contentType.toUpperCase()}
        </Badge>
      </div>

      {/* Duration Badge (for videos) */}
      {duration && contentType === "video" && (
        <div className="absolute top-2 right-2 z-20">
          <Badge variant="secondary" className="text-xs bg-black/60 text-white border-0">
            {formatDuration(duration)}
          </Badge>
        </div>
      )}

      {/* Play/Pause Button Overlay */}
      {contentType === "video" && (
        <div
          className={`absolute inset-0 flex items-center justify-center z-30 transition-opacity duration-200 ${
            isHovered || !displayThumbnail ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            {isPlaying ? <Pause className="h-6 w-6 text-white" /> : <Play className="h-6 w-6 text-white ml-0.5" />}
          </div>
        </div>
      )}

      {/* Download Button */}
      <div
        className={`absolute bottom-2 right-2 z-40 transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <Button
          size="sm"
          variant="secondary"
          className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 border-0"
          onClick={handleDownload}
        >
          <Download className="h-3 w-3 text-white" />
        </Button>
      </div>

      {/* File Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 z-20">
        <div className="text-white text-xs font-medium truncate">{title}</div>
        <div className="text-white/70 text-xs">{formatFileSize(fileSize)}</div>
      </div>
    </div>
  )
}
