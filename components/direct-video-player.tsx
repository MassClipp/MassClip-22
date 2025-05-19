"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Play, Pause } from "lucide-react"

interface DirectVideoPlayerProps {
  videoUrl: string
  thumbnailUrl?: string
  title?: string
  className?: string
  inlinePlayback?: boolean
}

export default function DirectVideoPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  className = "",
  inlinePlayback = false,
}: DirectVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isError, setIsError] = useState(false)
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlayPause = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch((err) => {
        console.error("Error playing video:", err)
        setIsError(true)
      })
    }
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    // Only auto-pause if we're in inline playback mode
    if (inlinePlayback && videoRef.current && isPlaying) {
      videoRef.current.pause()
    }
  }

  const handleThumbnailLoad = () => {
    setThumbnailLoaded(true)
  }

  return (
    <div
      className={`relative overflow-hidden bg-zinc-900 rounded-lg ${className}`}
      style={{ aspectRatio: "9/16" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail image - always visible when not playing */}
      {!isPlaying && (
        <div className="absolute inset-0">
          {thumbnailUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${thumbnailUrl})`,
                backgroundColor: "#111", // Fallback color
              }}
            >
              {/* Dark overlay with gradient for premium look */}
              <div
                className={`absolute inset-0 transition-opacity duration-300 ${
                  isHovered ? "opacity-30" : "opacity-50"
                }`}
                style={{
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7))",
                }}
              ></div>

              {/* Hidden image to preload */}
              <img
                src={thumbnailUrl || "/placeholder.svg"}
                alt=""
                className="hidden"
                onLoad={handleThumbnailLoad}
                crossOrigin="anonymous"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-zinc-500 text-sm">
              No preview
            </div>
          )}
        </div>
      )}

      {/* Play/Pause button overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center cursor-pointer ${
          isHovered || isPlaying ? "bg-black/20" : "bg-transparent"
        }`}
        onClick={handlePlayPause}
      >
        {(isHovered || isPlaying) && (
          <button
            className={`${
              isPlaying ? "bg-black/50 hover:bg-black/70 opacity-0 hover:opacity-100" : "bg-red-500/80 hover:bg-red-500"
            } text-white rounded-full p-3 transition-all`}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </button>
        )}
      </div>

      {/* Video element */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        preload="metadata"
        poster={thumbnailUrl || undefined}
        style={{
          display: isPlaying ? "block" : "none",
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={(e) => {
          console.error("Video error:", e)
          setIsError(true)
        }}
        muted={true} // Start muted to allow autoplay
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Error message */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-xs p-2 text-center">
          Unable to play video
        </div>
      )}

      {/* Title overlay - only show if provided */}
      {title && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-xs truncate">{title}</p>
        </div>
      )}
    </div>
  )
}
