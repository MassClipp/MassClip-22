"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Play, Volume2, VolumeX } from "lucide-react"

interface SimpleVideoPlayerProps {
  videoUrl: string
  thumbnailUrl?: string
  title?: string
  className?: string
  aspectRatio?: "9/16" | "16/9" | "1/1"
}

export default function SimpleVideoPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  className = "",
  aspectRatio = "9/16",
}: SimpleVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isError, setIsError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlayPause = () => {
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
    e.stopPropagation()
    if (!videoRef.current) return

    videoRef.current.muted = !videoRef.current.muted
    setIsMuted(videoRef.current.muted)
  }

  const handleVideoError = () => {
    console.error("Video error with URL:", videoUrl)
    setIsError(true)
  }

  // Calculate aspect ratio style
  const getAspectRatioStyle = () => {
    switch (aspectRatio) {
      case "16/9":
        return { paddingBottom: "56.25%" }
      case "1/1":
        return { paddingBottom: "100%" }
      case "9/16":
      default:
        return { paddingBottom: "177.78%" }
    }
  }

  return (
    <div className={`relative overflow-hidden bg-black rounded-lg ${className}`} style={getAspectRatioStyle()}>
      {/* Thumbnail or poster */}
      {!isPlaying && thumbnailUrl && (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${thumbnailUrl})` }}>
          <div className="absolute inset-0 bg-black/30"></div>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        poster={thumbnailUrl}
        playsInline
        preload="metadata"
        muted={isMuted}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={handleVideoError}
        onLoadedData={() => setIsLoaded(true)}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Play/Pause overlay */}
      <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlayPause}>
        {!isPlaying && !isError && (
          <button className="bg-red-500/80 hover:bg-red-500 text-white rounded-full p-3 transition-all">
            <Play className="h-5 w-5 ml-0.5" />
          </button>
        )}
      </div>

      {/* Controls overlay - only visible when playing */}
      {isPlaying && (
        <div className="absolute bottom-2 right-2 flex space-x-2">
          <button
            onClick={toggleMute}
            className="bg-black/50 p-2 rounded-full text-white hover:bg-black/70 transition-colors"
          >
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
      {title && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm truncate">{title}</p>
        </div>
      )}
    </div>
  )
}
