"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { isVideoFormatSupported, checkVideoFormat } from "@/lib/video-utils"

interface ClipPlayerProps {
  src: string
  title?: string
  poster?: string
  aspectRatio?: "16/9" | "9/16" | "1/1"
}

export default function ClipPlayer({ src, title, poster, aspectRatio = "16/9" }: ClipPlayerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [videoSrc, setVideoSrc] = useState<string>(src)
  const [formatInfo, setFormatInfo] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [useFallback, setUseFallback] = useState(false)

  // Process the URL to handle spaces and special characters
  useEffect(() => {
    try {
      // Ensure URL is properly encoded
      const processedUrl = src.includes("%20") ? src : encodeURI(src)
      setVideoSrc(processedUrl)

      // Check format support
      const mp4Supported = isVideoFormatSupported("video/mp4")
      setFormatInfo(`MP4 support: ${mp4Supported ? "Yes" : "No"}`)

      // Log for debugging
      console.log("Original URL:", src)
      console.log("Processed URL:", processedUrl)
      console.log("Browser MP4 support:", mp4Supported)

      // Check the actual video format
      checkVideoFormat(processedUrl)
        .then((format) => {
          console.log("Detected video format:", format)
          if (format && !isVideoFormatSupported(format)) {
            console.warn(`Browser does not support format: ${format}`)
          }
        })
        .catch((err) => {
          console.error("Error checking format:", err)
        })
    } catch (err) {
      console.error("URL processing error:", err)
      setError("Invalid video URL format")
    }
  }, [src])

  const handleLoadedData = () => {
    setIsLoading(false)
    console.log("Video loaded successfully:", videoSrc)
  }

  const handleLoadStart = () => {
    console.log("Video load started:", videoSrc)
  }

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setIsLoading(false)
    const videoElement = e.target as HTMLVideoElement

    // Log detailed error information
    console.error("Video error:", e)
    console.error("Video error code:", videoElement.error?.code)
    console.error("Video error message:", videoElement.error?.message)

    // Set appropriate error message based on error code
    if (videoElement.error) {
      switch (videoElement.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          setError("Video playback was aborted.")
          break
        case MediaError.MEDIA_ERR_NETWORK:
          setError("A network error caused the video download to fail.")
          break
        case MediaError.MEDIA_ERR_DECODE:
          setError("The video could not be decoded. The file might be corrupted.")
          break
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          setError("The video format is not supported by your browser.")
          // Try fallback if not already using it
          if (!useFallback) {
            setUseFallback(true)
          }
          break
        default:
          setError("An unknown error occurred. Please try again later.")
      }
    } else {
      setError("Failed to load video. Please try again later.")
    }
  }

  // Force video reload on retry
  const handleRetry = () => {
    setIsLoading(true)
    setError(null)
    setUseFallback(false)

    // Force reload by temporarily removing the source
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.removeAttribute("src")
      videoRef.current.load()
      videoRef.current.src = videoSrc
      videoRef.current.load()
      videoRef.current.play().catch((e) => console.error("Play error:", e))
    }
  }

  // Handle interaction to help with autoplay policies
  const handleInteraction = () => {
    if (!hasInteracted && videoRef.current) {
      setHasInteracted(true)
      videoRef.current.play().catch((e) => console.error("Play error:", e))
    }
  }

  // Render a fallback player using an iframe
  const renderFallbackPlayer = () => {
    return (
      <div className="relative w-full h-full">
        <iframe
          src={`https://iframe.mediadelivery.net/embed/player?url=${encodeURIComponent(videoSrc)}`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    )
  }

  // Render a direct link to the video
  const renderDirectLink = () => {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-center p-4 z-20">
        <div>
          <p className="text-red-400 mb-2">Your browser doesn't support this video format.</p>
          <a
            href={videoSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-crimson text-white text-sm rounded hover:bg-crimson-dark transition-colors inline-block"
          >
            Download Video
          </a>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-zinc-700 text-white text-sm rounded hover:bg-zinc-600 transition-colors ml-2"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio }} onClick={handleInteraction}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-crimson rounded-full animate-spin"></div>
        </div>
      )}

      {error && !useFallback && renderDirectLink()}

      {useFallback ? (
        renderFallbackPlayer()
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-cover rounded-lg bg-black"
          controls
          preload="metadata"
          poster={poster}
          onLoadStart={handleLoadStart}
          onLoadedData={handleLoadedData}
          onError={handleError}
          playsInline
          crossOrigin="anonymous"
        >
          <source src={videoSrc} type="video/mp4" />
          <source src={videoSrc.replace(".mp4", ".webm")} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      )}

      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h3 className="text-white font-medium truncate">{title}</h3>
        </div>
      )}

      {formatInfo && (
        <div className="absolute top-2 right-2 bg-black/70 text-xs text-white px-2 py-1 rounded">{formatInfo}</div>
      )}
    </div>
  )
}
