"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX, Download, Heart, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { useUserPlan } from "@/hooks/use-user-plan"

interface DirectVideoPlayerProps {
  videoUrl: string
  thumbnailUrl?: string
  title?: string
  className?: string
  inlinePlayback?: boolean
  videoId?: string
  creatorId?: string
  isPremium?: boolean
  onDelete?: () => void
}

export default function DirectVideoPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  className = "",
  inlinePlayback = false,
  videoId,
  creatorId,
  isPremium = false,
  onDelete,
}: DirectVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [localThumbnail, setLocalThumbnail] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isCheckingFavorite, setIsCheckingFavorite] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null)

  const { user } = useAuth()
  const { toast } = useToast()
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()
  const { planData } = useUserPlan()

  // Create a hidden download link element
  useEffect(() => {
    // Create a hidden anchor element for downloads
    const downloadLink = document.createElement("a")
    downloadLink.style.display = "none"
    document.body.appendChild(downloadLink)
    downloadLinkRef.current = downloadLink

    return () => {
      if (downloadLink.parentNode) {
        downloadLink.parentNode.removeChild(downloadLink)
      }
    }
  }, [])

  // Check if video is in favorites
  useEffect(() => {
    const checkIfFavorite = async () => {
      if (!user || !videoId) {
        setIsCheckingFavorite(false)
        return
      }

      try {
        // Query for this video in user's favorites
        const favoritesRef = collection(db, `users/${user.uid}/favorites`)
        const q = query(favoritesRef, where("videoId", "==", videoId))
        const querySnapshot = await getDocs(q)

        setIsFavorite(!querySnapshot.empty)
      } catch (err) {
        console.error("Error checking favorite status:", err)
      } finally {
        setIsCheckingFavorite(false)
      }
    }

    checkIfFavorite()
  }, [user, videoId])

  // Log props for debugging
  useEffect(() => {
    console.log("DirectVideoPlayer props:", { videoUrl, thumbnailUrl, title, videoId, creatorId })

    // If no thumbnail is provided, try to generate one from the video
    if (!thumbnailUrl && videoUrl && !localThumbnail) {
      generateThumbnailFromVideo()
    }
  }, [videoUrl, thumbnailUrl, title, localThumbnail, videoId, creatorId])

  // Function to generate a thumbnail from the video
  const generateThumbnailFromVideo = () => {
    const video = document.createElement("video")
    video.crossOrigin = "anonymous"
    video.src = videoUrl
    video.muted = true
    video.preload = "metadata"

    video.onloadeddata = () => {
      // Try to seek to 25% of the video
      try {
        video.currentTime = Math.min(video.duration * 0.25, 3)
      } catch (e) {
        console.error("Error seeking video:", e)
      }
    }

    video.onseeked = () => {
      try {
        // Create a canvas and draw the video frame
        const canvas = document.createElement("canvas")
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 360

        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const thumbnailDataUrl = canvas.toDataURL("image/jpeg")
          setLocalThumbnail(thumbnailDataUrl)
        }
      } catch (e) {
        console.error("Error generating thumbnail:", e)
      }
    }

    video.onerror = () => {
      console.error("Error loading video for thumbnail generation")
    }
  }

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch((err) => {
        console.error("Error playing video:", err)
        setIsError(true)
      })
    }
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!videoRef.current) return

    videoRef.current.muted = !videoRef.current.muted
    setIsMuted(videoRef.current.muted)
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    // Only auto-pause if we're in inline playback mode
    if (inlinePlayback && videoRef.current && isPlaying) {
      videoRef.current.pause()
    }
  }

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleEnded = () => setIsPlaying(false)

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error("Video error:", e)
    console.error("Video error details:", videoRef.current?.error)
    setIsError(true)
  }

  // Toggle favorite status
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user || !videoId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save favorites",
        variant: "destructive",
      })
      return
    }

    try {
      if (isFavorite) {
        // Find and remove from favorites
        const favoritesRef = collection(db, `users/${user.uid}/favorites`)
        const q = query(favoritesRef, where("videoId", "==", videoId))
        const querySnapshot = await getDocs(q)

        querySnapshot.forEach(async (document) => {
          await deleteDoc(doc(db, `users/${user.uid}/favorites`, document.id))
        })

        toast({
          title: "Removed from favorites",
          description: "Video removed from your favorites",
        })
      } else {
        // Add to favorites
        const videoData = {
          videoId,
          title: title || "Untitled",
          thumbnailUrl: thumbnailUrl || localThumbnail,
          url: videoUrl,
          isPremium,
          creatorId,
        }

        await addDoc(collection(db, `users/${user.uid}/favorites`), {
          videoId: videoId,
          video: videoData,
          createdAt: serverTimestamp(),
        })

        toast({
          title: "Added to favorites",
          description: "Video saved to your favorites",
        })
      }

      // Toggle state
      setIsFavorite(!isFavorite)
    } catch (err) {
      console.error("Error toggling favorite:", err)
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      })
    }
  }

  // Direct download function
  const startDirectDownload = async (url: string, filename: string) => {
    try {
      // Fetch the file
      const response = await fetch(url)
      if (!response.ok) throw new Error("Network response was not ok")

      // Get the blob
      const blob = await response.blob()

      // Create object URL
      const objectUrl = URL.createObjectURL(blob)

      // Use the hidden anchor to download
      if (downloadLinkRef.current) {
        downloadLinkRef.current.href = objectUrl
        downloadLinkRef.current.download = filename
        downloadLinkRef.current.click()

        // Clean up
        setTimeout(() => {
          URL.revokeObjectURL(objectUrl)
        }, 100)
      }

      return true
    } catch (error) {
      console.error("Direct download failed:", error)
      return false
    }
  }

  // Record a download directly in Firestore
  const recordDownload = async () => {
    if (!user) return { success: false, message: "User not authenticated" }

    // Creator Pro users don't need to track downloads
    if (isProUser) return { success: true }

    try {
      const userDocRef = doc(db, "users", user.uid)

      // Increment download count in user-plan-badge.tsx
      forceRefresh()

      return { success: true }
    } catch (err) {
      console.error("Error recording download:", err)
      return {
        success: false,
        message: "Failed to record download. Please try again.",
      }
    }
  }

  // Handle download button click
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Prevent multiple clicks
    if (isDownloading) return

    setIsDownloading(true)

    try {
      // 1. Basic authentication check
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to download videos",
          variant: "destructive",
        })
        return
      }

      // 2. Check if download link exists
      if (!videoUrl) {
        toast({
          title: "Download Error",
          description: "No download links available for this video.",
          variant: "destructive",
        })
        return
      }

      // 3. Creator Pro users bypass limit checks
      if (!isProUser) {
        // 4. Strict limit check - this is the core permission enforcement
        if (hasReachedLimit) {
          toast({
            title: "Download Limit Reached",
            description: "You've reached your monthly download limit. Upgrade to Creator Pro for unlimited downloads.",
            variant: "destructive",
          })
          return
        }

        // 5. CRITICAL: Record the download FIRST for free users
        const result = await recordDownload()

        // If recording failed, abort the download
        if (!result.success) {
          toast({
            title: "Download Error",
            description: result.message || "Failed to record download.",
            variant: "destructive",
          })
          return
        }
      }

      // 6. Only now, trigger the actual download
      const filename = `${title?.replace(/[^\w\s]/gi, "") || "video"}.mp4`
      const success = await startDirectDownload(videoUrl, filename)

      if (!success) {
        // Fallback to traditional method if direct download fails
        if (downloadLinkRef.current) {
          downloadLinkRef.current.href = videoUrl
          downloadLinkRef.current.download = filename
          downloadLinkRef.current.click()
        }
      }

      // Show success toast
      toast({
        title: "Download Started",
        description: "Your video is downloading",
      })
    } catch (error) {
      console.error("Download failed:", error)

      toast({
        title: "Download Error",
        description: "There was an issue starting your download. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  // Handle delete button click
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Show confirmation first
    setShowDeleteConfirm(true)
  }

  // Confirm delete
  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user || !videoId || !creatorId) {
      toast({
        title: "Error",
        description: "Missing required information to delete video",
        variant: "destructive",
      })
      return
    }

    // Check if user is the creator
    if (user.uid !== creatorId) {
      toast({
        title: "Permission Denied",
        description: "You can only delete your own videos",
        variant: "destructive",
      })
      return
    }

    try {
      // Determine collection based on premium status
      const collectionPath = isPremium ? `users/${creatorId}/premiumClips` : `users/${creatorId}/freeClips`

      // Delete from Firestore
      await deleteDoc(doc(db, collectionPath, videoId))

      toast({
        title: "Video Deleted",
        description: "Your video has been successfully deleted",
      })

      // Call the onDelete callback if provided
      if (onDelete) {
        onDelete()
      }
    } catch (error) {
      console.error("Error deleting video:", error)
      toast({
        title: "Delete Error",
        description: "There was an issue deleting your video. Please try again.",
        variant: "destructive",
      })
    } finally {
      setShowDeleteConfirm(false)
    }
  }

  // Cancel delete
  const cancelDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }

  // Determine which thumbnail to use
  const effectiveThumbnail = thumbnailUrl || localThumbnail

  // Check if user is the creator
  const isCreator = user && creatorId && user.uid === creatorId

  return (
    <div
      className={`relative overflow-hidden bg-zinc-900 rounded-lg ${className}`}
      style={{ aspectRatio: "9/16" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail display */}
      {!isPlaying && (
        <div className="absolute inset-0">
          {effectiveThumbnail ? (
            <img
              src={effectiveThumbnail || "/placeholder.svg"}
              alt={title || "Video thumbnail"}
              className="w-full h-full object-cover"
              onError={() => console.error("Thumbnail failed to load:", effectiveThumbnail)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-800 text-zinc-500">
              <Play className="h-12 w-12 mb-2 text-red-500/70" />
              <span className="text-sm">Play video</span>
            </div>
          )}

          {/* Dark overlay for better contrast */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${isHovered ? "opacity-30" : "opacity-50"}`}
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7))",
            }}
          ></div>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        poster={effectiveThumbnail || undefined}
        playsInline
        preload="metadata"
        style={{ display: isPlaying ? "block" : "none" }}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        muted={isMuted}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Action buttons container - only show when hovered */}
      {isHovered && (
        <div className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between transition-opacity duration-300">
          {/* Download button */}
          <button
            className={`${
              hasReachedLimit && !isProUser ? "bg-zinc-800/90 cursor-not-allowed" : "bg-black/70 hover:bg-black/90"
            } p-1.5 rounded-full transition-all duration-300`}
            onClick={handleDownload}
            aria-label={hasReachedLimit && !isProUser ? "Download limit reached" : "Download video"}
            disabled={isDownloading || (hasReachedLimit && !isProUser)}
            title={hasReachedLimit && !isProUser ? "Upgrade to Creator Pro for unlimited downloads" : "Download video"}
          >
            <Download className="h-3.5 w-3.5 text-white" />
          </button>

          {/* Favorite button */}
          <button
            className={`bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300 ${
              isFavorite ? "text-red-500" : "text-white"
            }`}
            onClick={toggleFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            disabled={isCheckingFavorite}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
          </button>

          {/* Delete button - only show for creator */}
          {isCreator && (
            <button
              className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300 text-white hover:text-red-500"
              onClick={handleDelete}
              aria-label="Delete video"
              title="Delete video"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Play/Pause overlay */}
      <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
        {!isPlaying && (
          <button className="bg-red-500/80 hover:bg-red-500 text-white rounded-full p-3 transition-all">
            <Play className="h-5 w-5 ml-0.5" />
          </button>
        )}
        {isPlaying && isHovered && (
          <button className="bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all">
            <Pause className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Mute/Unmute button - only show when playing */}
      {isPlaying && (
        <div className="absolute bottom-2 right-2 z-10" onClick={toggleMute}>
          <button className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-all">
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="bg-zinc-900 p-4 rounded-lg max-w-[90%] text-center">
            <h3 className="text-white text-sm font-medium mb-2">Delete Video?</h3>
            <p className="text-zinc-400 text-xs mb-4">This action cannot be undone.</p>
            <div className="flex justify-center gap-2">
              <button
                className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded"
                onClick={confirmDelete}
              >
                Delete
              </button>
              <button
                className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-3 py-1 rounded"
                onClick={cancelDelete}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white p-4 text-center">
          <p>Unable to play video</p>
        </div>
      )}

      {/* Title overlay */}
      {title && !isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm truncate">{title}</p>
        </div>
      )}

      {/* Premium badge if applicable */}
      {isPremium && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center">
          <span className="text-[10px]">Premium</span>
        </div>
      )}

      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" width="640" height="360" />
    </div>
  )
}
