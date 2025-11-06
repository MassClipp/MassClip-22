"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"

interface DirectVideoPlayerProps {
  title: string
  videoUrl?: string
  thumbnailUrl?: string
  fallbackUrl?: string
}

export function DirectVideoPlayer({
  title,
  videoUrl,
  thumbnailUrl,
  fallbackUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
}: DirectVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const actualVideoUrl = videoUrl || fallbackUrl

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
      }
    }
  }, [])

  return (
    <div
      className="relative aspect-video rounded-lg overflow-hidden group bg-black"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Thumbnail overlay when not playing */}
      {thumbnailUrl && !isPlaying && (
        <img
          src={thumbnailUrl || "/placeholder.svg"}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        src={actualVideoUrl}
        className="w-full h-full object-cover"
        poster={thumbnailUrl || `/placeholder.svg?height=200&width=320&text=${encodeURIComponent(title)}`}
        preload="metadata"
        playsInline
        muted={isMuted}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={(e) => {
          console.error("Video error:", e)
          setError("Video playback error")
        }}
      />

      {/* Play/Pause overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-200 ${
          isPlaying && !isHovering ? "opacity-0" : "opacity-100"
        }`}
      >
        <button
          onClick={togglePlay}
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          aria-label={isPlaying ? "Pause video" : "Play video"}
        >
          {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
        </button>
      </div>

      {/* Mute button */}
      <div
        className={`absolute bottom-4 right-4 transition-opacity duration-200 ${
          !isHovering ? "opacity-0" : "opacity-100"
        }`}
      >
        <button
          onClick={toggleMute}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* Title overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <h3 className="text-white font-medium truncate">{title}</h3>
      </div>

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-white text-center p-4">
            <p className="font-medium">Video Error</p>
            <p className="text-sm mt-1 text-white/70">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Default export for compatibility
export default DirectVideoPlayer
