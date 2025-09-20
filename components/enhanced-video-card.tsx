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
  creatorName?: string
  creatorId?: string
  onCreatorClick?: () => void
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
  creatorName,
  creatorId,
  onCreatorClick,
}: EnhancedVideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null)
  const [thumbnailError, setThumbnailError] = useState(false)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!fileUrl || generatedThumbnail || isGeneratingThumbnail) return

    const generateThumbnail = async () => {
      setIsGeneratingThumbnail(true)

      try {
        const video = document.createElement("video")
        video.muted = true
        video.playsInline = true
        video.preload = "metadata"
        video.crossOrigin = "anonymous"

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            const seekTime = Math.min(0.5, video.duration * 0.05)
            video.currentTime = seekTime
          }

          video.onseeked = () => {
            try {
              const canvas = document.createElement("canvas")
              const ctx = canvas.getContext("2d")

              if (!ctx) {
                reject(new Error("Could not get canvas context"))
                return
              }

              canvas.width = video.videoWidth || 320
              canvas.height = video.videoHeight || 180

              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

              try {
                const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.9)
                setGeneratedThumbnail(thumbnailDataUrl)
              } catch (corsError) {
                console.warn("CORS prevented thumbnail generation, using fallback")
                setThumbnailError(true)
              }
              resolve()
            } catch (error) {
              reject(error)
            }
          }

          video.onerror = () => reject(new Error("Video loading failed"))
          video.src = fileUrl
        })
      } catch (error) {
        console.error("Error generating thumbnail:", error)
        setThumbnailError(true)
      } finally {
        setIsGeneratingThumbnail(false)
      }
    }

    const timer = setTimeout(generateThumbnail, 100)
    return () => clearTimeout(timer)
  }, [fileUrl, generatedThumbnail, isGeneratingThumbnail])

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
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

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!fileUrl) return

    const link = document.createElement("a")
    link.href = fileUrl
    link.download = `${title || "video"}.mp4`
    link.click()
  }

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFavorite(!isFavorite)
  }

  const aspectRatioClass =
    aspectRatio === "square" ? "aspect-square" : aspectRatio === "wide" ? "aspect-video" : "aspect-[9/16]"

  const displayThumbnail = generatedThumbnail
  const showThumbnailLoading = !displayThumbnail && !thumbnailError && isGeneratingThumbnail

  return (
    <div className={`flex-shrink-0 w-full ${className}`}>
      <div
        className={`relative ${aspectRatioClass} overflow-hidden rounded-lg bg-zinc-900 group cursor-pointer`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        {creatorName && (
          <div className="absolute top-2 right-2 z-50">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onCreatorClick?.()
              }}
              className="bg-black/80 hover:bg-black/90 text-white text-xs px-2 py-1 rounded-full transition-all duration-200 backdrop-blur-sm border border-white/20"
            >
              {creatorName}
            </button>
          </div>
        )}

        {displayThumbnail && (
          <div className="absolute inset-0">
            <Image
              src={displayThumbnail || "/placeholder.svg"}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
            />
          </div>
        )}

        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${isPlaying ? "z-10" : "z-0 opacity-0"}`}
          preload="metadata"
          onEnded={() => setIsPlaying(false)}
          playsInline
          controls={false}
          muted={false}
        >
          <source src={fileUrl} type={mimeType} />
        </video>

        <div className="absolute inset-0 border border-white/0 group-hover:border-white/40 rounded-lg transition-all duration-200 z-20"></div>

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

        {showThumbnailLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 z-5">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin"></div>
              <span className="text-xs text-zinc-400">Loading video...</span>
            </div>
          </div>
        )}

        {thumbnailError && !displayThumbnail && (
          <video className="absolute inset-0 w-full h-full object-cover z-5" preload="metadata" muted playsInline>
            <source src={fileUrl} type={mimeType} />
          </video>
        )}

        {!displayThumbnail && !thumbnailError && !showThumbnailLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 z-5">
            <div className="flex flex-col items-center gap-2 text-center p-4">
              <Play className="h-8 w-8 text-zinc-400" />
              <span className="text-xs text-zinc-400">Click to play</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-1 flex justify-between items-center">
        <span className="text-xs text-zinc-400 truncate max-w-[70%]">{title}</span>
        {fileSize > 0 && <span className="text-xs text-zinc-400">{formatFileSize(fileSize)}</span>}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
