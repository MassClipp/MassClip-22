"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Play, Pause, Download, Heart } from "lucide-react"
import { formatFileSize } from "@/lib/utils"

interface EnhancedVideoCardProps {
  id: string
  title: string
  fileUrl: string
  thumbnailUrl?: string
  fileSize?: number
  mimeType?: string
  onClick?: () => void
  className?: string
  aspectRatio?: "video" | "square" | "wide"
  showControls?: boolean
}

export default function EnhancedVideoCard({
  id,
  title,
  fileUrl,
  thumbnailUrl,
  fileSize = 0,
  mimeType = "video/mp4",
  onClick,
  className = "",
  aspectRatio = "video",
  showControls = true,
}: EnhancedVideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

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

  // Handle download
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!fileUrl) return

    const link = document.createElement("a")
    link.href = fileUrl
    link.download = `${title || "video"}.mp4`
    link.click()
  }

  // Toggle favorite
  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFavorite(!isFavorite)
  }

  // Determine aspect ratio class
  const aspectRatioClass =
    aspectRatio === "square" ? "aspect-square" : aspectRatio === "wide" ? "aspect-video" : "aspect-[9/16]"

  return (
    <div className={`flex-shrink-0 w-full ${className}`}>
      <div
        className={`relative ${aspectRatioClass} overflow-hidden rounded-lg bg-zinc-900 group`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        {/* Direct Video Player */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          preload="metadata"
          onClick={togglePlay}
          onEnded={() => setIsPlaying(false)}
          poster={thumbnailUrl}
        >
          <source src={fileUrl} type={mimeType} />
        </video>

        {/* Border that appears on hover */}
        <div className="absolute inset-0 border border-white/0 group-hover:border-white/40 rounded-lg transition-all duration-200"></div>

        {/* Play/Pause Button Overlay - Only visible on hover */}
        {showControls && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
            >
              {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white" />}
            </button>
          </div>
        )}

        {/* Action buttons - only visible on hover */}
        {showControls && (
          <>
            <div className="absolute bottom-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300"
                onClick={handleDownload}
                aria-label="Download"
                title="Download"
              >
                <Download className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            <div className="absolute bottom-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                className={`bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300 ${
                  isFavorite ? "text-red-500" : "text-white"
                }`}
                onClick={toggleFavorite}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* File info below video */}
      <div className="mt-1 flex justify-between items-center">
        <span className="text-xs text-zinc-400 truncate max-w-[70%]">{title}</span>
        {fileSize > 0 && <span className="text-xs text-zinc-400">{formatFileSize(fileSize)}</span>}
      </div>
    </div>
  )
}
