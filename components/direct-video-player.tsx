"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Play, Pause } from "lucide-react"

interface DirectVideoPlayerProps {
  videoUrl: string
  thumbnailUrl?: string
  title?: string
  className?: string
}

export default function DirectVideoPlayer({ videoUrl, thumbnailUrl, title, className = "" }: DirectVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isError, setIsError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Log props for debugging
  useEffect(() => {
    console.log("DirectVideoPlayer props:", { videoUrl, thumbnailUrl, title })
  }, [videoUrl, thumbnailUrl, title])

  const togglePlay = () => {
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

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleEnded = () => setIsPlaying(false)

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error("Video error:", e)
    console.error("Video error details:", videoRef.current?.error)
    setIsError(true)
  }

  return (
    <div className={`relative overflow-hidden bg-black rounded-lg ${className}`} style={{ aspectRatio: "9/16" }}>
      {/* Video element - using the exact same approach as the debug player */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        poster={thumbnailUrl}
        playsInline
        preload="metadata"
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Play/Pause overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20"
        onClick={togglePlay}
      >
        {!isPlaying && !isError && (
          <button className="bg-red-500/80 hover:bg-red-500 text-white rounded-full p-3 transition-all">
            <Play className="h-5 w-5 ml-0.5" />
          </button>
        )}
        {isPlaying && (
          <button className="bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all opacity-0 hover:opacity-100">
            <Pause className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Error message */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white p-4 text-center">
          <p>Unable to play video</p>
        </div>
      )}

      {/* Title overlay */}
      {title && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm truncate">{title}</p>
        </div>
      )}
    </div>
  )
}
