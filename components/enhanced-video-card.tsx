"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Play, Pause, Download, Heart } from "lucide-react"
import { formatFileSize } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

interface EnhancedVideoCardProps {
  id: string
  title: string
  fileUrl: string
  thumbnailUrl?: string
  fileSize?: number
  mimeType?: string
  onClick?: () => void
  className?: string
  aspectRatio?: "video" | "square" | "wide"
  showControls?: boolean
  uid?: string
  creatorName?: string
  username?: string
  userDisplayName?: string
}

export default function EnhancedVideoCard({
  id,
  title,
  fileUrl,
  thumbnailUrl,
  fileSize = 0,
  mimeType = "video/mp4",
  onClick,
  className = "",
  aspectRatio = "video",
  showControls = true,
  uid,
  creatorName,
  username,
  userDisplayName,
}: EnhancedVideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null)
  const [thumbnailError, setThumbnailError] = useState(false)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
  const [creatorUsername, setCreatorUsername] = useState<string | null>(null)
  const [creatorDisplayName, setCreatorDisplayName] = useState<string | null>(null)
  const [isLoadingCreatorData, setIsLoadingCreatorData] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchCreatorData = async () => {
      setIsLoadingCreatorData(true)

      if (!uid) {
        // Fallback to existing data if no UID
        setCreatorUsername(username || creatorName?.toLowerCase().replace(/\s+/g, "") || "unknown")
        setCreatorDisplayName(userDisplayName || creatorName || "Creator")
        setIsLoadingCreatorData(false)
        return
      }

      try {
        // Get the user document directly by UID for most current data
        const userDocRef = doc(db, "users", uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()

          // Use the current data from Firestore - prioritize username, fallback to displayName
          const currentUsername =
            userData.username || userData.displayName?.toLowerCase().replace(/\s+/g, "") || "unknown"
          const currentDisplayName = userData.displayName || userData.username || "Creator"

          setCreatorUsername(currentUsername)
          setCreatorDisplayName(currentDisplayName)
        } else {
          // Fallback to existing data
          setCreatorUsername(username || creatorName?.toLowerCase().replace(/\s+/g, "") || "unknown")
          setCreatorDisplayName(userDisplayName || creatorName || "Creator")
        }
      } catch (error) {
        console.error("Error fetching creator data:", error)
        // Fallback to existing data
        setCreatorUsername(username || creatorName?.toLowerCase().replace(/\s+/g, "") || "unknown")
        setCreatorDisplayName(userDisplayName || creatorName || "Creator")
      } finally {
        setIsLoadingCreatorData(false)
      }
    }

    fetchCreatorData()
  }, [uid, username, creatorName, userDisplayName, id])

  useEffect(() => {
    if (!fileUrl || generatedThumbnail || isGeneratingThumbnail) return

    const generateThumbnail = async () => {
      setIsGeneratingThumbnail(true)

      try {
        const video = document.createElement("video")
        video.muted = true
        video.playsInline = true
        video.preload = "metadata"

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            // Seek to 0.5 seconds or 5% of video duration, whichever is smaller
            const seekTime = Math.min(0.5, video.duration * 0.05)
            video.currentTime = seekTime
          }

          video.onseeked = () => {
            try {
              const canvas = document.createElement("canvas")
              const ctx = canvas.getContext("2d")

              if (!ctx) {
                reject(new Error("Could not get canvas context"))
                return
              }

              // Set canvas dimensions to match video
              canvas.width = video.videoWidth || 320
              canvas.height = video.videoHeight || 180

              // Draw video frame to canvas
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

              // Convert to data URL with high quality
              const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.9)
              setGeneratedThumbnail(thumbnailDataUrl)
              resolve()
            } catch (error) {
              reject(error)
            }
          }

          video.onerror = () => reject(new Error("Video loading failed"))
          video.src = fileUrl
        })
      } catch (error) {
        console.error("Error generating thumbnail:", error)
        setThumbnailError(true)
      } finally {
        setIsGeneratingThumbnail(false)
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(generateThumbnail, 100)
    return () => clearTimeout(timer)
  }, [fileUrl, generatedThumbnail, isGeneratingThumbnail])

  const handleCreatorClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const username = creatorUsername || "unknown"
    router.push(`/creator/${username}`)
  }

  // Handle play/pause
  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      // Pause all other videos first
      document.querySelectorAll("video").forEach((v) => {
        if (v !== videoRef.current) {
          v.pause()
        }
      })

      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch((error) => {
          console.error("Error playing video:", error)
        })
    }
  }

  // Handle download
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!fileUrl) return

    const link = document.createElement("a")
    link.href = fileUrl
    link.download = `${title || "video"}.mp4`
    link.click()
  }

  // Toggle favorite
  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFavorite(!isFavorite)
  }

  // Determine aspect ratio class
  const aspectRatioClass =
    aspectRatio === "square" ? "aspect-square" : aspectRatio === "wide" ? "aspect-video" : "aspect-[9/16]"

  const displayThumbnail = generatedThumbnail

  return (
    <div className={`flex-shrink-0 w-full ${className}`}>
      <div
        className={`relative ${aspectRatioClass} overflow-hidden rounded-lg bg-zinc-900 group cursor-pointer`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        {displayThumbnail && !isPlaying && (
          <div className="absolute inset-0">
            <img src={displayThumbnail || "/placeholder.svg"} alt={title} className="w-full h-full object-cover" />
          </div>
        )}

        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${isPlaying ? "z-10" : "z-0 opacity-0"}`}
          preload="metadata"
          onEnded={() => setIsPlaying(false)}
          playsInline
          controls={false}
          muted={false}
        >
          <source src={fileUrl} type={mimeType} />
        </video>

        {!isLoadingCreatorData && creatorDisplayName && (
          <button
            onClick={handleCreatorClick}
            className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full hover:bg-black/90 transition-all duration-200 z-30"
            title={`Visit ${creatorDisplayName}'s storefront`}
          >
            @{creatorUsername}
          </button>
        )}

        {/* Border that appears on hover */}
        <div className="absolute inset-0 border border-white/0 group-hover:border-white/40 rounded-lg transition-all duration-200 z-20"></div>

        {/* Play/Pause Button Overlay - Only visible on hover */}
        {showControls && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center transition-all duration-200"
            >
              {isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
            </button>
          </div>
        )}

        {/* Action buttons - only visible on hover */}
        {showControls && (
          <>
            <div className="absolute bottom-2 right-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300"
                onClick={handleDownload}
                aria-label="Download"
                title="Download"
              >
                <Download className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            <div className="absolute bottom-2 left-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                className={`bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300 ${
                  isFavorite ? "text-red-500" : "text-white"
                }`}
                onClick={toggleFavorite}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
          </>
        )}

        {isGeneratingThumbnail && !displayThumbnail && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 z-5">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin"></div>
              <span className="text-xs text-zinc-400">Loading...</span>
            </div>
          </div>
        )}

        {thumbnailError && !displayThumbnail && !isGeneratingThumbnail && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 z-5">
            <div className="flex flex-col items-center gap-2 text-center p-4">
              <Play className="h-8 w-8 text-zinc-400" />
              <span className="text-xs text-zinc-400">Click to play</span>
            </div>
          </div>
        )}
      </div>

      {/* File info below video */}
      <div className="mt-1 flex justify-between items-center">
        <span className="text-xs text-zinc-400 truncate max-w-[70%]">{title}</span>
        {fileSize > 0 && <span className="text-xs text-zinc-400">{formatFileSize(fileSize)}</span>}
      </div>
    </div>
  )
}
