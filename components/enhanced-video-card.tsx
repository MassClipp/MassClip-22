"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Play, Pause, Download, Heart } from "lucide-react"
import { formatFileSize } from "@/lib/utils"
import Image from "next/image"

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
  const [isPlaying, setIsPlaying] = useState(false)
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null)
  const [thumbnailError, setThumbnailError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Generate thumbnail from video for Safari compatibility
  useEffect(() => {
    if (!fileUrl || generatedThumbnail || thumbnailUrl) return

    const generateThumbnail = () => {
      const video = document.createElement("video")
      video.crossOrigin = "anonymous"
      video.muted = true
      video.playsInline = true
      video.preload = "metadata"
      video.setAttribute("webkit-playsinline", "true")
      video.setAttribute("playsinline", "true")

      video.onloadedmetadata = () => {
        // Seek to 1 second or 10% of video duration, whichever is smaller
        const seekTime = Math.min(1, video.duration * 0.1)
        video.currentTime = seekTime
      }

      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")

          if (!ctx) return

          // Set canvas dimensions to match video
          canvas.width = video.videoWidth || 320
          canvas.height = video.videoHeight || 180

          try {
            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            // Convert to data URL with Safari-compatible format
            const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.8)
            setGeneratedThumbnail(thumbnailDataUrl)
          } catch (canvasError) {
            console.error("Canvas drawing error (Safari compatibility):", canvasError)
            setThumbnailError(true)
          }

          // Clean up
          video.remove()
        } catch (error) {
          console.error("Error generating thumbnail:", error)
          setThumbnailError(true)
        }
      }

      video.onerror = (error) => {
        console.error("Error loading video for thumbnail:", error)
        setThumbnailError(true)
      }

      video.onloadstart = () => {
        // Set a timeout for Safari in case it hangs
        setTimeout(() => {
          if (!generatedThumbnail && !thumbnailError) {
            console.warn("Thumbnail generation timeout - Safari compatibility issue")
            setThumbnailError(true)
          }
        }, 5000)
      }

      video.src = fileUrl
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(generateThumbnail, 100)
    return () => clearTimeout(timer)
  }, [fileUrl, generatedThumbnail, thumbnailUrl, thumbnailError])

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

  // Get the best available thumbnail
  const displayThumbnail =
    thumbnailUrl || generatedThumbnail || `/placeholder.svg?height=720&width=1280&query=${encodeURIComponent(title)}`

  return (
    <div className={`flex-shrink-0 w-full ${className}`}>
      <div
        className={`relative ${aspectRatioClass} overflow-hidden rounded-lg bg-zinc-900 group`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        {/* Thumbnail Image - Always visible */}
        <div className="absolute inset-0">
          <Image
            src={displayThumbnail || "/placeholder.svg"}
            alt={title}
            fill
            className="object-cover"
            onError={() => setThumbnailError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
            crossOrigin="anonymous"
          />
        </div>

        {/* Video Player - Only visible when playing */}
        {isPlaying && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover z-10"
            preload="metadata"
            onEnded={() => setIsPlaying(false)}
            muted
            playsInline
          >
            <source src={fileUrl} type={mimeType} />
          </video>
        )}

        {/* Border that appears on hover */}
        <div className="absolute inset-0 border border-white/0 group-hover:border-white/40 rounded-lg transition-all duration-200 z-20"></div>

        {/* Play/Pause Button Overlay - Only visible on hover */}
        {showControls && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center transition-all duration-200"
            >
              {isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
            </button>
          </div>
        )}

        {/* Action buttons - only visible on hover */}
        {showControls && (
          <>
            <div className="absolute bottom-2 right-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300"
                onClick={handleDownload}
                aria-label="Download"
                title="Download"
              >
                <Download className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            <div className="absolute bottom-2 left-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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

        {/* Loading indicator while generating thumbnail */}
        {!thumbnailUrl && !generatedThumbnail && !thumbnailError && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 z-5">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* File info below video */}
      <div className="mt-1 flex justify-between items-center">
        <span className="text-xs text-zinc-400 truncate max-w-[70%]">{title}</span>
        {fileSize > 0 && <span className="text-xs text-zinc-400">{formatFileSize(fileSize)}</span>}
      </div>

      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
