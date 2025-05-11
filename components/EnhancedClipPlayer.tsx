"use client"

import { useState, useRef, useEffect } from "react"

interface EnhancedClipPlayerProps {
  src: string
  title?: string
  autoPlay?: boolean
  poster?: string
}

export default function EnhancedClipPlayer({ src, title, autoPlay = false, poster }: EnhancedClipPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime)
      setProgress((videoElement.currentTime / videoElement.duration) * 100)
    }
    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration)
      setIsLoading(false)
    }
    const handleWaiting = () => setIsLoading(true)
    const handlePlaying = () => setIsLoading(false)

    videoElement.addEventListener("play", handlePlay)
    videoElement.addEventListener("pause", handlePause)
    videoElement.addEventListener("timeupdate", handleTimeUpdate)
    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata)
    videoElement.addEventListener("waiting", handleWaiting)
    videoElement.addEventListener("playing", handlePlaying)

    return () => {
      videoElement.removeEventListener("play", handlePlay)
      videoElement.removeEventListener("pause", handlePause)
      videoElement.removeEventListener("timeupdate", handleTimeUpdate)
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata)
      videoElement.removeEventListener("waiting", handleWaiting)
      videoElement.removeEventListener("playing", handlePlaying)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  return (
    <div className="max-w-[720px] mx-auto p-4">
      {title && <h2 className="text-xl font-semibold mb-2">{title}</h2>}
      <div className="relative">
        <video
          ref={videoRef}
          controls
          width="100%"
          height="auto"
          preload="metadata"
          autoPlay={autoPlay}
          poster={poster}
          className="rounded-xl bg-black"
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        )}
      </div>
      <div className="mt-2 text-sm text-gray-500 flex justify-between">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}
