"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Play, Heart, Download, Trash2, Volume2, VolumeX } from "lucide-react"
import { doc, deleteDoc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface DirectVideoPlayerProps {
  videoUrl: string
  thumbnailUrl?: string
  title: string
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
  inlinePlayback = false,
  videoId,
  creatorId,
  isPremium = false,
  onDelete,
}: DirectVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // Check if the video is in favorites
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user || !videoId) return

      try {
        const favoriteRef = doc(db, `users/${user.uid}/favorites/${videoId}`)
        const favoriteDoc = await getDoc(favoriteRef)
        setIsFavorite(favoriteDoc.exists())
      } catch (error) {
        console.error("Error checking favorite status:", error)
      }
    }

    checkFavoriteStatus()
  }, [user, videoId])

  // Generate thumbnail if none provided
  useEffect(() => {
    if (!thumbnailUrl && videoUrl && !generatedThumbnail) {
      const video = document.createElement("video")
      video.crossOrigin = "anonymous"
      video.src = videoUrl
      video.muted = true
      video.preload = "metadata"

      video.onloadeddata = () => {
        // Seek to 25% of the video duration for a good thumbnail
        video.currentTime = video.duration * 0.25
      }

      video.onseeked = () => {
        const canvas = document.createElement("canvas")
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL("image/jpeg")
        setGeneratedThumbnail(dataUrl)
        video.remove()
      }

      video.onerror = () => {
        console.error("Error generating thumbnail")
        video.remove()
      }

      video.load()
    }
  }, [thumbnailUrl, videoUrl, generatedThumbnail])

  // Handle play/pause
  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation()

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        // Pause all other videos before playing this one
        document.querySelectorAll("video").forEach((video) => {
          if (video !== videoRef.current) {
            video.pause()
          }
        })

        videoRef.current.play().catch((error) => {
          console.error("Error playing video:", error)
          toast({
            title: "Playback Error",
            description: "There was a problem playing this video. Please try again.",
            variant: "destructive",
          })
        })
      }
    }
  }

  // Handle video events
  const handlePlay = () => {
    setIsPlaying(true)
    setShowControls(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleEnded = () => {
    setIsPlaying(false)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
  }

  // Toggle mute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // Handle mouse events
  const handleMouseEnter = () => {
    setIsHovering(true)
    setShowControls(true)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
    if (!isPlaying) {
      setShowControls(false)
    }
  }

  // Handle favorite toggle
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to favorite videos",
      })
      return
    }

    if (!videoId || !creatorId) {
      toast({
        title: "Error",
        description: "Could not favorite this video",
        variant: "destructive",
      })
      return
    }

    try {
      const favoriteRef = doc(db, `users/${user.uid}/favorites/${videoId}`)

      if (isFavorite) {
        // Remove from favorites
        await deleteDoc(favoriteRef)
        setIsFavorite(false)
        toast({
          title: "Removed from favorites",
          description: "Video removed from your favorites",
        })
      } else {
        // Add to favorites
        await setDoc(favoriteRef, {
          videoId,
          creatorId,
          title,
          thumbnailUrl: thumbnailUrl || generatedThumbnail,
          videoUrl,
          isPremium,
          addedAt: new Date(),
        })
        setIsFavorite(true)
        toast({
          title: "Added to favorites",
          description: "Video added to your favorites",
        })
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast({
        title: "Error",
        description: "There was a problem updating your favorites",
        variant: "destructive",
      })
    }
  }

  // Handle download
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to download videos",
      })
      return
    }

    try {
      // Check if user has download permissions
      const response = await fetch("/api/check-purchase-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid: user.uid }),
      })

      const data = await response.json()

      if (!data.canDownload) {
        toast({
          title: "Download limit reached",
          description: "Upgrade to Pro for unlimited downloads",
          variant: "destructive",
        })
        return
      }

      // Create an anchor element and trigger download
      const a = document.createElement("a")
      a.href = videoUrl
      a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      toast({
        title: "Download started",
        description: "Your video is downloading",
      })
    } catch (error) {
      console.error("Error downloading video:", error)
      toast({
        title: "Download failed",
        description: "There was a problem downloading this video",
        variant: "destructive",
      })
    }
  }

  // Handle delete
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    if (!user || !videoId || !creatorId) {
      toast({
        title: "Error",
        description: "Could not delete this video",
        variant: "destructive",
      })
      return
    }

    try {
      // Check if user is the creator
      if (user.uid !== creatorId) {
        toast({
          title: "Permission denied",
          description: "You can only delete your own videos",
          variant: "destructive",
        })
        return
      }

      // Delete from the appropriate collection
      const collectionPath = isPremium ? `users/${creatorId}/premiumClips` : `users/${creatorId}/freeClips`

      await deleteDoc(doc(db, collectionPath, videoId))

      toast({
        title: "Video deleted",
        description: "Your video has been removed",
      })

      // Call the onDelete callback if provided
      if (onDelete) {
        onDelete()
      }
    } catch (error) {
      console.error("Error deleting video:", error)
      toast({
        title: "Delete failed",
        description: "There was a problem deleting this video",
        variant: "destructive",
      })
    } finally {
      setShowDeleteConfirm(false)
    }
  }

  // Cancel delete confirmation
  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }

  return (
    <div
      ref={containerRef}
      className="relative group"
      style={{
        position: "relative",
        paddingBottom: "177.78%", // 9:16 aspect ratio
        height: 0,
        borderRadius: "8px",
        overflow: "hidden",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={togglePlay}
    >
      {/* Border overlay that appears on hover */}
      <div
        className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-0"
        style={{
          border: "1px solid rgba(220, 20, 60, 0.5)",
          borderRadius: "8px",
          boxShadow: "0 0 20px rgba(220, 20, 60, 0.2)",
        }}
      ></div>

      {/* Video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className={`absolute inset-0 w-full h-full object-cover ${isPlaying ? "z-20" : "z-0"}`}
        playsInline
        loop={false}
        muted={isMuted}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        style={{ borderRadius: "8px" }}
      />

      {/* Thumbnail or placeholder */}
      {!isPlaying && (
        <div className="absolute inset-0 z-10 bg-zinc-900">
          {thumbnailUrl || generatedThumbnail ? (
            <img
              src={thumbnailUrl || generatedThumbnail || ""}
              alt={title}
              className="w-full h-full object-cover"
              style={{ borderRadius: "8px" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
              <span className="text-zinc-500 text-sm">No preview</span>
            </div>
          )}
        </div>
      )}

      {/* Premium badge */}
      {isPremium && (
        <div className="absolute top-2 right-2 z-30 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center">
          <span className="text-[10px]">Premium</span>
        </div>
      )}

      {/* Play button overlay */}
      {!isPlaying && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 transition-opacity duration-300 hover:opacity-70"
          style={{ borderRadius: "8px" }}
        >
          <div className="rounded-full bg-red-500/80 p-2 transform transition-transform duration-300 hover:scale-110">
            <Play className="h-6 w-6 text-white" fill="white" />
          </div>
        </div>
      )}

      {/* Video controls */}
      {(showControls || isHovering) && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            {/* Left controls */}
            <div className="flex items-center space-x-2">
              {/* Mute/unmute button */}
              <button onClick={toggleMute} className="text-white hover:text-red-500 transition-colors">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            {/* Right controls */}
            <div className="flex items-center space-x-2">
              {/* Favorite button */}
              <button
                onClick={toggleFavorite}
                className={`hover:scale-110 transition-transform ${isFavorite ? "text-red-500" : "text-white"}`}
              >
                <Heart className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
              </button>

              {/* Download button */}
              <button
                onClick={handleDownload}
                className="text-white hover:text-red-500 transition-colors hover:scale-110"
              >
                <Download className="h-4 w-4" />
              </button>

              {/* Delete button (only for owner) */}
              {user && creatorId && user.uid === creatorId && (
                <button
                  onClick={handleDelete}
                  className={`text-white hover:text-red-500 transition-colors hover:scale-110 ${
                    showDeleteConfirm ? "text-red-500" : ""
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="absolute bottom-10 right-0 bg-zinc-900 p-2 rounded-md shadow-lg z-40 text-xs">
              <p className="text-white mb-2">Delete this video?</p>
              <div className="flex space-x-2">
                <button onClick={handleDelete} className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
                  Yes
                </button>
                <button onClick={cancelDelete} className="bg-zinc-700 text-white px-2 py-1 rounded hover:bg-zinc-600">
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
