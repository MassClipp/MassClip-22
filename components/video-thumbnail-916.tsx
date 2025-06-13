"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Play, Pause, Download } from "lucide-react"

// Named export as required
export function VideoThumbnail916({
  title,
  videoUrl,
  thumbnailUrl,
  fileSize,
  duration,
  contentType = "video",
  onClick,
  className = "",
}: {
  title: string
  videoUrl: string
  thumbnailUrl?: string
  fileSize?: number
  duration?: number
  contentType?: "video" | "audio" | "image" | "document" | string
  onClick?: () => void
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

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

  // Handle play/pause
  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      // Pause all other videos first
      document.querySelectorAll("video").forEach((v) => {
        if (v !== videoRef.current) {
          v.pause()
        }
      })

      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch((error) => {
          console.error("Error playing video:", error)
        })
    }
  }

  return (
    <div className={`flex-shrink-0 w-full ${className}`}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 group" onClick={onClick}>
        {contentType === "video" ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              preload="metadata"
              onClick={togglePlay}
              onEnded={() => setIsPlaying(false)}
              poster={thumbnailUrl}
            >
              <source src={videoUrl} type="video/mp4" />
            </video>

            {/* Border that appears on hover */}
            <div className="absolute inset-0 border border-white/0 group-hover:border-white/40 rounded-lg transition-all duration-200"></div>

            {/* Play/Pause Button Overlay - Only visible on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
              >
                {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white" />}
              </button>
            </div>

            {/* Download button - only visible on hover */}
            <div className="absolute bottom-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  const link = document.createElement("a")
                  link.href = videoUrl
                  link.download = `${title || "video"}.mp4`
                  link.click()
                }}
                aria-label="Download"
                title="Download"
              >
                <Download className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
            <div className="text-center">
              <p className="text-xs text-zinc-500 truncate px-1">{title}</p>
            </div>
          </div>
        )}
      </div>

      {/* File info below video */}
      <div className="mt-1 flex justify-between items-center">
        <span className="text-xs text-zinc-400 truncate max-w-[70%]">{title}</span>
        {fileSize && fileSize > 0 && <span className="text-xs text-zinc-400">{formatFileSize(fileSize)}</span>}
      </div>
    </div>
  )
}
