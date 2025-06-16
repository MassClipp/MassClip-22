"use client"

import { useState, useEffect, useRef } from "react"
import { VideoThumbnailGenerator } from "@/lib/video-thumbnail-generator"

interface DynamicVideoThumbnailProps {
  videoUrl: string
  title: string
  className?: string
  fallbackSrc?: string
  timeInSeconds?: number
}

export function DynamicVideoThumbnail({
  videoUrl,
  title,
  className = "",
  fallbackSrc = "/placeholder.svg",
  timeInSeconds = 1,
}: DynamicVideoThumbnailProps) {
  const [thumbnailSrc, setThumbnailSrc] = useState<string>(fallbackSrc)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasError, setHasError] = useState(false)
  const generatedRef = useRef(false)

  useEffect(() => {
    // Only generate once per component instance
    if (generatedRef.current || !videoUrl || hasError) return

    const generateThumbnail = async () => {
      try {
        setIsGenerating(true)
        generatedRef.current = true

        console.log(`🔍 [DynamicThumbnail] Generating thumbnail for: ${videoUrl}`)

        const thumbnailDataUrl = await VideoThumbnailGenerator.generateThumbnailFromUrl(videoUrl, timeInSeconds)
        setThumbnailSrc(thumbnailDataUrl)

        console.log(`✅ [DynamicThumbnail] Thumbnail generated successfully`)
      } catch (error) {
        console.error("❌ [DynamicThumbnail] Failed to generate thumbnail:", error)
        setHasError(true)
        setThumbnailSrc(fallbackSrc)
      } finally {
        setIsGenerating(false)
      }
    }

    // Small delay to avoid overwhelming the browser
    const timeoutId = setTimeout(generateThumbnail, 100)
    return () => clearTimeout(timeoutId)
  }, [videoUrl, timeInSeconds, fallbackSrc, hasError])

  return (
    <div className={`relative ${className}`}>
      <img
        src={thumbnailSrc || "/placeholder.svg"}
        alt={title}
        className="w-full h-full object-cover"
        onError={() => {
          if (thumbnailSrc !== fallbackSrc) {
            console.log(`⚠️ [DynamicThumbnail] Image load failed, using fallback`)
            setThumbnailSrc(fallbackSrc)
          }
        }}
      />

      {isGenerating && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}
