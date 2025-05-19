"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Play, Pause } from "lucide-react"

interface DirectVideoPlayerProps {
  videoUrl: string
  thumbnailUrl?: string
  title?: string
  inlinePlayback?: boolean // Add this prop
}

export default function DirectVideoPlayer({
  videoUrl,
  thumbnailUrl,
  title = "Video",
  inlinePlayback = false,
}: DirectVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
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
      })
    }
  }

  // If inline playback, we need to handle hover states
  const handleMouseEnter = () => {
    if (inlinePlayback) {
      setIsHovered(true)
    }
  }

  const handleMouseLeave = () => {
    if (inlinePlayback) {
      setIsHovered(false)
      // Optionally pause when mouse leaves
      if (videoRef.current && isPlaying) {
        videoRef.current.pause()
      }
    }
  }

  return (
    <div
      className="relative w-full h-full"
      style={{ aspectRatio: inlinePlayback ? "9/16" : "auto" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail image */}
      {!isPlaying && thumbnailUrl && (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${thumbnailUrl})` }}>
          {/* Dark overlay with gradient for premium look */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${isHovered ? "opacity-30" : "opacity-50"}`}
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7))",
            }}
          ></div>
        </div>
      )}

      {/* Play/Pause button overlay */}
      {(isHovered || isPlaying) && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20" onClick={handlePlayPause}>
          <button
            className="bg-red-500/80 hover:bg-red-500 text-white rounded-full p-3 transition-all"
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </button>
        </div>
      )}

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
        muted={true} // Start muted to allow autoplay
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
