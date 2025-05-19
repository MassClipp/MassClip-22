"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"

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
  const [isMuted, setIsMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Log props for debugging
  useEffect(() => {
    console.log("DirectVideoPlayer props:", { videoUrl, thumbnailUrl, title })
  }, [videoUrl, thumbnailUrl, title])

  const togglePlay = (e: React.MouseEvent) => {
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

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!videoRef.current) return

    videoRef.current.muted = !videoRef.current.muted
    setIsMuted(videoRef.current.muted)
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

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleEnded = () => setIsPlaying(false)

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error("Video error:", e)
    console.error("Video error details:", videoRef.current?.error)
    setIsError(true)
  }

  return (
    <div
      className={`relative overflow-hidden bg-zinc-900 rounded-lg ${className}`}
      style={{ aspectRatio: "9/16" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail as an actual image element */}
      {!isPlaying && thumbnailUrl && (
        <img
          src={thumbnailUrl || "/placeholder.svg"}
          alt={title || "Video thumbnail"}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => console.error("Thumbnail failed to load:", thumbnailUrl)}
        />
      )}

      {/* Fallback for no thumbnail */}
      {!isPlaying && !thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-zinc-500 text-sm">
          No preview
        </div>
      )}

      {/* Dark overlay */}
      {!isPlaying && (
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${isHovered ? "opacity-30" : "opacity-50"}`}
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7))",
          }}
        ></div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        poster={thumbnailUrl}
        playsInline
        preload="metadata"
        style={{ display: isPlaying ? "block" : "none" }}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        muted={isMuted}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Play/Pause overlay */}
      <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
        {!isPlaying && (
          <button className="bg-red-500/80 hover:bg-red-500 text-white rounded-full p-3 transition-all">
            <Play className="h-5 w-5 ml-0.5" />
          </button>
        )}
        {isPlaying && isHovered && (
          <button className="bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all">
            <Pause className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Mute/Unmute button - only show when playing */}
      {isPlaying && (
        <div className="absolute bottom-2 right-2 z-10" onClick={toggleMute}>
          <button className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-all">
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Error message */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white p-4 text-center">
          <p>Unable to play video</p>
        </div>
      )}

      {/* Title overlay */}
      {title && !isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm truncate">{title}</p>
        </div>
      )}
    </div>
  )
}
