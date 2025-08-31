"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Heart, Download, Play, Pause } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { db } from "@/lib/firebase"
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore"
import { trackFirestoreWrite } from "@/lib/firestore-optimizer"

export function InlineVimeoCard({ video }: { video: any }) {
  const [isActive, setIsActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [isIframeLoaded, setIsIframeLoaded] = useState(false)
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadLink, setDownloadLink] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isCheckingFavorite, setIsCheckingFavorite] = useState(true)

  const { user } = useAuth()
  const { toast } = useToast()
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()
  const videoRef = useRef<HTMLIFrameElement>(null)
  const viewTrackedRef = useRef(false)
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null)

  // Extract video ID from URI (format: "/videos/12345678") with null check
  const videoId = video?.uri ? video.uri.split("/").pop() : null

  // Get the highest quality thumbnail
  const getHighQualityThumbnail = () => {
    if (!video?.pictures?.sizes || video.pictures.sizes.length === 0) {
      return ""
    }

    // Sort by size (largest first) and get the URL
    const sortedSizes = [...video.pictures.sizes].sort((a, b) => b.width - a.width)
    return sortedSizes[0].link
  }

  // Get the highest quality download link - do this early and cache it
  useEffect(() => {
    if (video?.download && video.download.length > 0) {
      const sortedDownloads = [...video.download].sort((a, b) => b.size - a.size)
      setDownloadLink(sortedDownloads[0].link)
    } else {
      setDownloadLink(null)
    }
  }, [video])

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

  // Track video view when active - OPTIMIZED: only track once per session
  useEffect(() => {
    const trackVideoView = async () => {
      if (!user || !isActive || viewTrackedRef.current || !videoId || !video) return

      try {
        // Add to user's history subcollection
        await addDoc(collection(db, `users/${user.uid}/history`), {
          videoId: videoId,
          video: video,
          viewedAt: serverTimestamp(),
        })

        // Track the write operation
        trackFirestoreWrite("VimeoCard-trackView", 1)

        viewTrackedRef.current = true
        setHasTrackedView(true)
      } catch (err) {
        console.error("Error tracking video view:", err)
      }
    }

    trackVideoView()
  }, [user, videoId, video, isActive])

  // Toggle favorite status
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user || !videoId || !video) {
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
        await addDoc(collection(db, `users/${user.uid}/favorites`), {
          videoId: videoId,
          video: video,
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

  // Record a download directly in Firestore
  const recordDownload = async () => {
    if (!user) return { success: false, message: "User not authenticated" }

    // Creator Pro users don't need to track downloads but we still record for analytics
    if (isProUser) return { success: true }

    try {
      const userDocRef = doc(db, "users", user.uid)

      // Increment download count
      await updateDoc(userDocRef, {
        downloads: increment(1),
      })

      // Force refresh the global limit status
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

  // Direct download function for desktop
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

  // Handle download button click with strict permission enforcement
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isDownloading) return

    // Check if user has reached limit BEFORE starting download
    if (!isProUser && hasReachedLimit) {
      toast({
        title: "Download Limit Reached",
        description: "You've reached your monthly download limit. Upgrade to Creator Pro for unlimited downloads.",
        variant: "destructive",
      })
      return
    }

    if (!downloadLink) {
      toast({
        title: "Download Unavailable",
        description: "This video is not available for download.",
        variant: "destructive",
      })
      return
    }

    setIsDownloading(true)
    setDownloadError(false)

    try {
      // Record the download first
      const recordResult = await recordDownload()
      if (!recordResult.success) {
        toast({
          title: "Download Failed",
          description: recordResult.message,
          variant: "destructive",
        })
        return
      }

      // Generate filename
      const videoTitle = video.name || "video"
      const cleanTitle = videoTitle.replace(/[^a-zA-Z0-9\s-_]/g, "").replace(/\s+/g, "_")
      const filename = `${cleanTitle}.mp4`

      // Try direct download first
      const directDownloadSuccess = await startDirectDownload(downloadLink, filename)

      if (!directDownloadSuccess) {
        // Fallback to opening in new tab
        window.open(downloadLink, "_blank")
      }

      toast({
        title: "Download Started",
        description: `Downloading "${video.name}"`,
      })
    } catch (error) {
      console.error("Download error:", error)
      setDownloadError(true)
      toast({
        title: "Download Failed",
        description: "Failed to download video. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const thumbnailUrl = getHighQualityThumbnail()

  return (
    <div
      className="flex-shrink-0 w-[160px] group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsActive(false)
      }}
      onClick={() => setIsActive(!isActive)}
    >
      <div
        style={{
          position: "relative",
          paddingBottom: "177.78%", // 9:16 aspect ratio
          overflow: "hidden",
          borderRadius: "12px",
          backgroundColor: "#18181b",
        }}
        className="shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:scale-105"
      >
        {/* Thumbnail */}
        {!isActive && thumbnailUrl && (
          <img
            src={thumbnailUrl || "/placeholder.svg"}
            alt={video.name || "Video thumbnail"}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onLoad={() => setThumbnailLoaded(true)}
            className={`transition-opacity duration-300 ${thumbnailLoaded ? "opacity-100" : "opacity-0"}`}
          />
        )}

        {/* Video Player */}
        {isActive && videoId && (
          <iframe
            ref={videoRef}
            src={`https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&background=1&controls=0`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: "none",
            }}
            allow="autoplay; fullscreen"
            onLoad={() => setIsIframeLoaded(true)}
            className={`transition-opacity duration-300 ${isIframeLoaded ? "opacity-100" : "opacity-0"}`}
          />
        )}

        {/* Overlay Controls */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Top Controls */}
          <div className="absolute top-2 right-2 flex gap-1">
            {/* Favorite Button */}
            <button
              onClick={toggleFavorite}
              disabled={isCheckingFavorite}
              className={`p-1.5 rounded-full backdrop-blur-sm transition-all duration-200 ${
                isFavorite
                  ? "bg-red-500/80 text-white hover:bg-red-600/80"
                  : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white"
              }`}
            >
              <Heart className={`h-3 w-3 ${isFavorite ? "fill-current" : ""}`} />
            </button>

            {/* Download Button */}
            {downloadLink && (
              <button
                onClick={handleDownload}
                disabled={isDownloading || (!isProUser && hasReachedLimit)}
                className={`p-1.5 rounded-full backdrop-blur-sm transition-all duration-200 ${
                  isDownloading
                    ? "bg-blue-500/80 text-white"
                    : !isProUser && hasReachedLimit
                      ? "bg-gray-500/40 text-gray-400 cursor-not-allowed"
                      : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white"
                }`}
              >
                <Download className={`h-3 w-3 ${isDownloading ? "animate-bounce" : ""}`} />
              </button>
            )}
          </div>

          {/* Play/Pause Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-2 rounded-full bg-black/40 backdrop-blur-sm">
              {isActive ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white" />}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {!thumbnailLoaded && !isActive && (
          <div className="absolute inset-0 bg-zinc-900/50 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="mt-2 px-1">
        <h3 className="text-xs font-medium text-white line-clamp-2 leading-tight">{video.name || "Untitled"}</h3>
        {video.stats?.plays && <p className="text-xs text-zinc-400 mt-1">{video.stats.plays.toLocaleString()} views</p>}
      </div>
    </div>
  )
}
