"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"

interface AutoplayVideoPlayerProps {
  title: string
  videoUrl: string
  thumbnailUrl?: string
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  className?: string
  onPlay?: () => void
  onPause?: () => void
}

export function AutoplayVideoPlayer({
  title,
  videoUrl,
  thumbnailUrl,
  autoplay = true,
  muted = true,
  loop = true,
  className = "",
  onPlay,
  onPause,
}: AutoplayVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay)
  const [isMuted, setIsMuted] = useState(muted)
  const [isHovering, setIsHovering] = useState(false)
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Start playing as soon as possible
  useEffect(() => {
    if (videoRef.current && autoplay) {
      const playPromise = videoRef.current.play()

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true)
            setHasStartedPlaying(true)
            onPlay?.()
          })
          .catch((err) => {
            console.error("Autoplay prevented:", err)
            // Most browsers require user interaction before autoplay with sound
            // Fall back to muted autoplay
            if (videoRef.current) {
              videoRef.current.muted = true
              setIsMuted(true)
              videoRef.current
                .play()
                .then(() => {
                  setIsPlaying(true)
                  setHasStartedPlaying(true)
                  onPlay?.()
                })
                .catch((e) => {
                  console.error("Muted autoplay also failed:", e)
                  setIsPlaying(false)
                })
            }
          })
      }
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
      }
    }
  }, [autoplay, onPlay])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        onPause?.()
      } else {
        videoRef.current
          .play()
          .then(() => {
            onPlay?.()
          })
          .catch((err) => {
            console.error("Play failed:", err)
            setError("Playback error: " + err.message)
          })
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-black ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Video element - preload="auto" for immediate loading */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        poster={thumbnailUrl}
        preload="auto"
        playsInline
        muted={isMuted}
        loop={loop}
        onPlay={() => {
          setIsPlaying(true)
          setHasStartedPlaying(true)
          onPlay?.()
        }}
        onPause={() => {
          setIsPlaying(false)
          onPause?.()
        }}
        onEnded={() => {
          if (!loop) {
            setIsPlaying(false)
            onPause?.()
          }
        }}
        onError={(e) => {
          console.error("Video error:", e)
          setError("Video playback error")
        }}
      />

      {/* Play/Pause overlay - only show when hovering or paused */}
      <div
        className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-200 ${
          isPlaying && !isHovering ? "opacity-0" : "opacity-100"
        }`}
        onClick={togglePlay}
      >
        <button
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          aria-label={isPlaying ? "Pause video" : "Play video"}
        >
          {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
        </button>
      </div>

      {/* Controls that appear on hover */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-200 ${
          isHovering ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium truncate mr-2">{title}</h3>

          <button
            onClick={toggleMute}
            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>
        </div>
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

export default AutoplayVideoPlayer
