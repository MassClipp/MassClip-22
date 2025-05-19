"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

interface DirectVideoPlayerProps {
  videoUrl: string
  title?: string
}

export default function DirectVideoPlayer({ videoUrl, title }: DirectVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Test if the video URL is accessible
  useEffect(() => {
    const testVideoUrl = async () => {
      if (!videoUrl) {
        setError("No video URL provided")
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(videoUrl, { method: "HEAD" })
        console.log(`Video URL test (${videoUrl}):`, response.status, response.statusText)

        if (!response.ok) {
          setError(`Video URL returned status: ${response.status}`)
        }
      } catch (error) {
        console.error("Error testing video URL:", error)
        setError("Failed to access video URL")
      } finally {
        setIsLoading(false)
      }
    }

    testVideoUrl()
  }, [videoUrl])

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElement = e.currentTarget
    console.error("Video error occurred:", videoElement.error)
    setError(`Video error: ${videoElement.error?.message || "Unknown error"}`)
  }

  const handleCanPlay = () => {
    setIsLoading(false)
    console.log("Video can play now")
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">{title || "Direct Video Player"}</h3>

      {isLoading && (
        <div className="flex items-center justify-center h-20 bg-zinc-900 rounded-lg">
          <div className="animate-spin h-6 w-6 border-2 border-zinc-500 border-t-white rounded-full"></div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-900 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "9/16" }}>
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls
          preload="metadata"
          onError={handleVideoError}
          onCanPlay={handleCanPlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          playsInline
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-zinc-400 break-all">
          <span className="text-zinc-300">Video URL:</span> {videoUrl}
        </p>
        <p className="text-zinc-400">
          <span className="text-zinc-300">Status:</span>{" "}
          {isLoading ? "Loading..." : error ? "Error" : isPlaying ? "Playing" : "Ready"}
        </p>

        <Button
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.load()
              console.log("Video reloaded")
            }
          }}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          Reload Video
        </Button>
      </div>
    </div>
  )
}
