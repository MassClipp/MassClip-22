"use client"

import type React from "react"
import { useState } from "react"

interface ClipPlayerProps {
  src: string
  title?: string
  poster?: string
  aspectRatio?: "16/9" | "9/16" | "1/1"
}

export default function ClipPlayer({ src, title, poster, aspectRatio = "16/9" }: ClipPlayerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleLoadedData = () => {
    setIsLoading(false)
  }

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setIsLoading(false)
    setError("Failed to load video. Please try again later.")
    console.error("Video error:", e)
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-crimson rounded-full animate-spin"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-center p-4">
          <div>
            <p className="text-red-400 mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-crimson text-white text-sm rounded hover:bg-crimson-dark transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <video
        className="w-full h-full object-cover rounded-lg bg-black"
        controls
        preload="metadata"
        poster={poster}
        onLoadedData={handleLoadedData}
        onError={handleError}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h3 className="text-white font-medium truncate">{title}</h3>
        </div>
      )}
    </div>
  )
}
