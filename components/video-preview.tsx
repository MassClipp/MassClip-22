"use client"

import { useState, useRef } from "react"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"

interface VideoPreviewProps {
  src: string
  title?: string
}

export function VideoPreview({ src, title }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

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

  return (
    <div className="relative rounded-lg overflow-hidden bg-black">
      <video ref={videoRef} src={src} className="w-full h-auto" onEnded={() => setIsPlaying(false)} muted={isMuted} />

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
        {title && <p className="text-white font-medium mb-2">{title}</p>}

        <div className="flex items-center space-x-4">
          <button onClick={togglePlay} className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors">
            {isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
          </button>

          <button onClick={toggleMute} className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors">
            {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
          </button>
        </div>
      </div>
    </div>
  )
}
