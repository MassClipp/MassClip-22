"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Film } from "lucide-react"
import { cn } from "@/lib/utils"

interface VideoPreviewProps {
  videoUrl?: string
  thumbnailUrl?: string
  isPremium?: boolean
  title: string
}

export function VideoPreview({ videoUrl, thumbnailUrl, isPremium = false, title }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Handle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch((error) => {
        console.error("Error playing video:", error)
      })
    }
  }

  // Update state when video plays/pauses
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    videoElement.addEventListener("play", handlePlay)
    videoElement.addEventListener("pause", handlePause)
    videoElement.addEventListener("ended", handleEnded)

    return () => {
      videoElement.removeEventListener("play", handlePlay)
      videoElement.removeEventListener("pause", handlePause)
      videoElement.removeEventListener("ended", handleEnded)
    }
  }, [])

  return (
    <div
      className="aspect-[9/16] w-full h-full bg-zinc-800 rounded-md overflow-hidden relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {videoUrl ? (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            poster={thumbnailUrl}
            className="w-full h-full object-cover"
            playsInline
            muted
            loop
          />

          {/* Play/Pause button overlay */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-300",
              isHovered || !isPlaying ? "opacity-100" : "opacity-0",
            )}
            onClick={togglePlay}
          >
            <button
              className="bg-white/20 backdrop-blur-sm rounded-full p-2 transition-transform duration-300 hover:scale-110"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
            </button>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
          <Film className="h-6 w-6 text-zinc-600" />
        </div>
      )}

      {/* Premium badge */}
      {isPremium ? (
        <div className="absolute top-1 right-1 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[10px] px-1 rounded-sm font-medium">
          PREMIUM
        </div>
      ) : (
        <div className="absolute top-1 right-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] px-1 rounded-sm font-medium">
          FREE
        </div>
      )}

      {/* Title overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="text-xs text-white truncate">{title}</p>
      </div>
    </div>
  )
}
