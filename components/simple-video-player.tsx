"use client"

import { useState, useRef } from "react"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SimpleVideoPlayerProps {
  videoUrl: string
  thumbnailUrl?: string
  title: string
}

export default function SimpleVideoPlayer({ videoUrl, thumbnailUrl, title }: SimpleVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch((err) => {
          console.error("Error playing video:", err)
        })
    }
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "9/16" }}>
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl || "/placeholder.svg"}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.onerror = null
                target.src = "/placeholder.svg?key=video-thumbnail"
              }}
            />
          )}

          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
            <Button
              onClick={handlePlay}
              size="lg"
              className="rounded-full w-16 h-16 bg-red-500/80 hover:bg-red-500 text-white"
            >
              <Play className="h-8 w-8 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        controls={isPlaying}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        poster={thumbnailUrl}
        playsInline
        preload="metadata"
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
