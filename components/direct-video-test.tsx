"use client"

import type React from "react"
import { useRef, useState } from "react"

interface DirectVideoTestProps {
  src: string
}

export default function DirectVideoTest({ src }: DirectVideoTestProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toISOString().substr(11, 8)}: ${message}`])
  }

  const handleLoadStart = () => {
    addLog("Video load started")
  }

  const handleLoadedMetadata = () => {
    addLog("Metadata loaded")
  }

  const handleLoadedData = () => {
    setIsLoading(false)
    addLog("Video data loaded successfully")
  }

  const handleCanPlay = () => {
    addLog("Video can play now")
  }

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setIsLoading(false)
    const videoElement = e.target as HTMLVideoElement

    addLog(`Error: ${videoElement.error?.code} - ${videoElement.error?.message}`)

    if (videoElement.error) {
      switch (videoElement.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          setError("Video playback was aborted.")
          break
        case MediaError.MEDIA_ERR_NETWORK:
          setError("A network error caused the video download to fail.")
          break
        case MediaError.MEDIA_ERR_DECODE:
          setError("The video could not be decoded.")
          break
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          setError("The video format is not supported.")
          break
        default:
          setError("An unknown error occurred.")
      }
    } else {
      setError("Failed to load video.")
    }
  }

  const handleRetry = () => {
    setIsLoading(true)
    setError(null)
    setLogs([])
    addLog("Retrying video load")

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.removeAttribute("src")
      videoRef.current.load()
      videoRef.current.src = src
      videoRef.current.load()
    }
  }

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play().catch((e) => {
        addLog(`Play error: ${e.message}`)
      })
    }
  }

  return (
    <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6 shadow-xl">
      <h2 className="text-xl font-medium text-white mb-4">Video Test</h2>

      <div className="mb-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-crimson rounded-full animate-spin"></div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-center p-4 z-20">
              <div>
                <p className="text-red-400 mb-2">{error}</p>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-crimson text-white text-sm rounded hover:bg-crimson-dark transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            preload="metadata"
            onLoadStart={handleLoadStart}
            onLoadedMetadata={handleLoadedMetadata}
            onLoadedData={handleLoadedData}
            onCanPlay={handleCanPlay}
            onError={handleError}
            playsInline
            crossOrigin="anonymous"
          >
            <source src={src} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      <div className="flex space-x-2 mb-4">
        <button
          onClick={handlePlay}
          className="px-4 py-2 bg-crimson text-white text-sm rounded hover:bg-crimson-dark transition-colors"
        >
          Force Play
        </button>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-zinc-700 text-white text-sm rounded hover:bg-zinc-600 transition-colors"
        >
          Reload Video
        </button>
      </div>

      <div className="mt-4">
        <h3 className="text-white font-medium mb-2">Debug Information</h3>
        <div className="bg-black/50 p-3 rounded-lg text-xs font-mono text-green-400 max-h-40 overflow-y-auto">
          <p>Video URL: {src}</p>
          {logs.map((log, index) => (
            <p key={index}>{log}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
