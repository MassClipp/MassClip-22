"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Search,
  Clock,
  Brain,
  Rocket,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Lock,
  Film,
  Heart,
  Download,
  Play,
  Pause,
  ArrowRight,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { filterCategoriesBySearch } from "@/lib/search-utils"
import { shuffleArray } from "@/lib/utils"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useCreatorUploads } from "@/hooks/use-creator-uploads"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import { useVimeoVideos } from "@/hooks/use-vimeo-videos"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
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
import { useToast } from "@/hooks/use-toast"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { trackFirestoreWrite } from "@/lib/firestore-optimizer"

// Inline VideoSkeleton component
function VideoSkeleton() {
  return (
    <div className="flex-shrink-0 w-[160px]">
      <div
        style={{
          position: "relative",
          paddingBottom: "177.78%", // 9:16 aspect ratio
          height: 0,
          borderRadius: "8px",
          overflow: "hidden",
          backgroundColor: "#1f1f1f",
        }}
        className="animate-pulse"
      ></div>
      <div className="mt-2 h-4 bg-zinc-800 rounded animate-pulse"></div>
      <div className="mt-1 h-3 w-2/3 bg-zinc-800 rounded animate-pulse"></div>
    </div>
  )
}

// Inline VimeoCard component
function InlineVimeoCard({ video }: { video: any }) {
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
      if (!downloadLink) {
        setDownloadError(true)
        toast({
          title: "Download Error",
          description: "No download links available for this video.",
          variant: "destructive",
        })

        // Fallback to opening Vimeo page
        if (video?.link) {
          window.open(video.link, "_blank")
        }
        return
      }

      // 3. CRITICAL: Check if user has reached download limit BEFORE downloading
      if (hasReachedLimit && !isProUser) {
        toast({
          title: "Download Limit Reached",
          description:
            "You've reached your monthly download limit of 25. Upgrade to Creator Pro for unlimited downloads.",
          variant: "destructive",
        })
        return
      }

      // 4. Record the download for tracking purposes
      const result = await recordDownload()
      if (!result.success && !isProUser) {
        toast({
          title: "Download Error",
          description: result.message || "Failed to record download.",
          variant: "destructive",
        })
        return
      }

      // 5. Trigger the actual download
      const filename = `${video?.name?.replace(/[^\w\s]/gi, "") || "video"}.mp4`

      const success = await startDirectDownload(downloadLink, filename)

      if (!success) {
        // Fallback to traditional method if direct download fails
        if (downloadLinkRef.current) {
          downloadLinkRef.current.href = downloadLink
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
      setDownloadError(true)

      toast({
        title: "Download Error",
        description: "There was an issue starting your download. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  // Handle iframe load event
  const handleIframeLoad = () => {
    setIsIframeLoaded(true)
  }

  // Handle thumbnail load event
  const handleThumbnailLoad = () => {
    setThumbnailLoaded(true)
  }

  const thumbnailUrl = getHighQualityThumbnail()

  // Modify the iframe src to disable fullscreen
  const getVideoSrc = () => {
    return `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479&quality=1080p`
  }

  return (
    <div className="flex-shrink-0 w-[160px]">
      <div
        className="group relative premium-hover-effect border border-transparent hover:border-white/20 transition-all duration-300"
        style={{
          position: "relative",
          paddingBottom: "177.78%", // 9:16 aspect ratio
          height: 0,
          borderRadius: "8px",
          overflow: "hidden",
        }}
        onMouseEnter={() => {
          setIsActive(true)
          setIsHovered(true)
        }}
        onMouseLeave={() => {
          setIsActive(false)
          setIsHovered(false)
        }}
        onClick={() => setIsActive(true)}
      >
        {/* Action buttons container */}
        <div
          className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between transition-opacity duration-300"
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          {/* Download button - show lock when limit reached */}
          <button
            className={`${
              hasReachedLimit && !isProUser ? "bg-zinc-800/90 cursor-not-allowed" : "bg-black/70 hover:bg-black/90"
            } p-1.5 rounded-full transition-all duration-300`}
            onClick={handleDownload}
            aria-label={hasReachedLimit && !isProUser ? "Download limit reached" : "Download video"}
            disabled={isDownloading || (hasReachedLimit && !isProUser)}
            title={hasReachedLimit && !isProUser ? "Upgrade to Creator Pro for unlimited downloads" : "Download video"}
          >
            {hasReachedLimit && !isProUser ? (
              <Lock className="h-3.5 w-3.5 text-zinc-400" />
            ) : (
              <Download className={`h-3.5 w-3.5 ${downloadError ? "text-red-500" : "text-white"}`} />
            )}
          </button>

          {/* Favorite button */}
          <button
            className={`bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300 ${
              isFavorite ? "text-crimson" : "text-white"
            }`}
            onClick={toggleFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            disabled={isCheckingFavorite}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>

        {videoId ? (
          <div className="absolute inset-0 video-container">
            {/* High-quality thumbnail with dark overlay */}
            {thumbnailUrl && (
              <div
                className={`absolute inset-0 video-card-thumbnail transition-all duration-300 ${
                  isActive && isIframeLoaded ? "opacity-0" : "opacity-100"
                }`}
                style={{
                  backgroundImage: `url(${thumbnailUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundColor: "#111",
                }}
              >
                {/* Dark overlay with gradient for premium look */}
                <div
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    isHovered ? "opacity-30" : "opacity-50"
                  }`}
                  style={{
                    background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7))",
                  }}
                ></div>

                {/* Preload the image with crossOrigin for canvas compatibility */}
                <img
                  src={thumbnailUrl || "/placeholder.svg"}
                  alt=""
                  className="hidden"
                  onLoad={handleThumbnailLoad}
                  crossOrigin="anonymous"
                />
              </div>
            )}

            {/* Video iframe with fade-in effect */}
            {isActive && (
              <iframe
                ref={videoRef}
                src={getVideoSrc()}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                  opacity: isIframeLoaded ? 1 : 0,
                  transition: "opacity 300ms ease-in-out",
                }}
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                title={video.name || "Video"}
                loading="lazy"
                onLoad={handleIframeLoad}
              ></iframe>
            )}
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#111",
            }}
          >
            <span className="text-xs text-zinc-500">Video unavailable</span>
          </div>
        )}
      </div>
      {/* Updated title div to allow wrapping */}
      <div
        className="mt-2 text-xs text-zinc-300 min-h-[2.5rem] line-clamp-2 font-light"
        title={video.name || "Untitled video"}
      >
        {video.name || "Untitled video"}
      </div>
    </div>
  )
}

// Inline CreatorUploadCard component
function InlineCreatorUploadCard({ video }: { video: any }) {
  const [downloadError, setDownloadError] = useState(false)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isCheckingFavorite, setIsCheckingFavorite] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()
  const router = useRouter()

  // Check if video is in favorites
  useEffect(() => {
    const checkIfFavorite = async () => {
      if (!user || !video.id) {
        setIsCheckingFavorite(false)
        return
      }

      try {
        const favoritesRef = collection(db, `users/${user.uid}/favorites`)
        const q = query(favoritesRef, where("videoId", "==", video.id))
        const querySnapshot = await getDocs(q)

        setIsFavorite(!querySnapshot.empty)
      } catch (err) {
        console.error("Error checking favorite status:", err)
      } finally {
        setIsCheckingFavorite(false)
      }
    }

    checkIfFavorite()
  }, [user, video.id])

  // Track video view
  const trackVideoView = async () => {
    if (!user || hasTrackedView || !video.id) return

    try {
      await addDoc(collection(db, `users/${user.uid}/history`), {
        videoId: video.id,
        video: video,
        viewedAt: serverTimestamp(),
      })

      trackFirestoreWrite("CreatorUploadCard-trackView", 1)
      setHasTrackedView(true)
    } catch (err) {
      console.error("Error tracking video view:", err)
    }
  }

  // Toggle video play/pause
  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setIsPlaying(false)
    } else {
      document.querySelectorAll("video").forEach((v) => {
        if (v !== videoRef.current) {
          v.pause()
          v.currentTime = 0
        }
      })

      videoRef.current.muted = false
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

  const handleVideoEnd = () => {
    setIsPlaying(false)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
  }

  // Toggle favorite status
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user || !video.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save favorites",
        variant: "destructive",
      })
      return
    }

    try {
      if (isFavorite) {
        const favoritesRef = collection(db, `users/${user.uid}/favorites`)
        const q = query(favoritesRef, where("videoId", "==", video.id))
        const querySnapshot = await getDocs(q)

        querySnapshot.forEach(async (document) => {
          await deleteDoc(doc(db, `users/${user.uid}/favorites`, document.id))
        })

        toast({
          title: "Removed from favorites",
          description: "Video removed from your favorites",
        })
      } else {
        // Create a sanitized version of the video object with all required fields
        const safeVideo = {
          id: video.id || "",
          title: video.title || "Untitled",
          fileUrl: video.fileUrl || "",
          thumbnailUrl: video.thumbnailUrl || "",
          creatorName: video.creatorName || "Unknown Creator",
          uid: video.uid || "",
          views: typeof video.views === "number" ? video.views : 0,
          downloads: typeof video.downloads === "number" ? video.downloads : 0,
        }

        // Remove any undefined values just to be extra safe
        const cleanVideo = Object.fromEntries(Object.entries(safeVideo).filter(([_, value]) => value !== undefined))

        await addDoc(collection(db, `users/${user.uid}/favorites`), {
          videoId: video.id,
          creatorUpload: cleanVideo,
          createdAt: serverTimestamp(),
        })

        toast({
          title: "Added to favorites",
          description: "Video saved to your favorites",
        })
      }

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

  // Record a download
  const recordDownload = async () => {
    if (!user) return { success: false, message: "User not authenticated" }

    if (isProUser) return { success: true }

    try {
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        downloads: increment(1),
      })

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

  // Handle download
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isDownloading) return

    setIsDownloading(true)

    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to download videos",
          variant: "destructive",
        })
        return
      }

      if (!video.fileUrl) {
        setDownloadError(true)
        toast({
          title: "Download Error",
          description: "No download link available for this video.",
          variant: "destructive",
        })
        return
      }

      // CRITICAL: Check if user has reached download limit BEFORE downloading
      if (hasReachedLimit && !isProUser) {
        toast({
          title: "Download Limit Reached",
          description:
            "You've reached your monthly download limit of 25. Upgrade to Creator Pro for unlimited downloads.",
          variant: "destructive",
        })
        return
      }

      // Record the download
      const result = await recordDownload()
      if (!result.success && !isProUser) {
        toast({
          title: "Download Error",
          description: result.message || "Failed to record download.",
          variant: "destructive",
        })
        return
      }

      // Direct download using fetch and blob
      try {
        const response = await fetch(video.fileUrl)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)

        const filename = `${video.title?.replace(/[^\w\s]/gi, "") || "video"}.mp4`
        const downloadLink = document.createElement("a")
        downloadLink.href = url
        downloadLink.download = filename
        downloadLink.style.display = "none"
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)

        // Clean up the blob URL
        window.URL.revokeObjectURL(url)

        toast({
          title: "Download Started",
          description: "Your video is downloading",
        })
      } catch (fetchError) {
        console.error("Fetch download failed, falling back to direct link:", fetchError)

        // Fallback to direct link method if fetch fails
        const filename = `${video.title?.replace(/[^\w\s]/gi, "") || "video"}.mp4`
        const downloadLink = document.createElement("a")
        downloadLink.href = video.fileUrl
        downloadLink.download = filename
        downloadLink.target = "_self" // Ensure it doesn't open in new tab
        downloadLink.style.display = "none"
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)

        toast({
          title: "Download Started",
          description: "Your video is downloading",
        })
      }
    } catch (error) {
      console.error("Download failed:", error)
      setDownloadError(true)

      toast({
        title: "Download Error",
        description: "There was an issue starting your download. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex-shrink-0 w-[160px]">
      <div
        className="relative group border border-transparent hover:border-white/20 transition-all duration-300 rounded-lg"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={trackVideoView}
      >
        <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 shadow-md">
          <video
            ref={videoRef}
            className="w-full h-full object-cover cursor-pointer"
            preload="metadata"
            muted={false}
            playsInline
            onEnded={handleVideoEnd}
            onClick={togglePlay}
            controls={false}
          >
            <source src={video.fileUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:bg-black/70"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
          </div>

          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

          <div className="absolute bottom-2 left-2 right-2 z-30 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              className={`${
                hasReachedLimit && !isProUser ? "bg-zinc-800/90 cursor-not-allowed" : "bg-black/70 hover:bg-black/90"
              } p-1.5 rounded-full transition-all duration-300 ${downloadError ? "ring-1 ring-red-500" : ""}`}
              onClick={handleDownload}
              aria-label={hasReachedLimit && !isProUser ? "Download limit reached" : "Download video"}
              disabled={isDownloading || (hasReachedLimit && !isProUser)}
              title={
                hasReachedLimit && !isProUser ? "Upgrade to Creator Pro for unlimited downloads" : "Download video"
              }
            >
              {hasReachedLimit && !isProUser ? (
                <Lock className="h-3.5 w-3.5 text-zinc-400" />
              ) : (
                <Download className={`h-3.5 w-3.5 ${downloadError ? "text-red-500" : "text-white"}`} />
              )}
            </button>

            <button
              className={`bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300 ${
                isFavorite ? "text-crimson" : "text-white"
              }`}
              onClick={toggleFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              disabled={isCheckingFavorite}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-zinc-300 min-h-[2.5rem] line-clamp-2 font-light" title={video.title}>
        {video.title || "Untitled video"}
      </div>
    </div>
  )
}

const detectCreatorUploadContentType = (upload: any): "video" | "audio" | "image" => {
  // Check MIME type first
  if (upload.mimeType) {
    if (upload.mimeType.startsWith("video/")) return "video"
    if (upload.mimeType.startsWith("audio/")) return "audio"
    if (upload.mimeType.startsWith("image/")) return "image"
  }

  // Fallback to file extension
  const url = (upload.fileUrl || "").toLowerCase()
  if (
    url.includes(".mp4") ||
    url.includes(".mov") ||
    url.includes(".avi") ||
    url.includes(".mkv") ||
    url.includes(".webm")
  ) {
    return "video"
  }
  if (url.includes(".mp3") || url.includes(".wav") || url.includes(".m4a") || url.includes(".aac")) {
    return "audio"
  }
  if (
    url.includes(".jpg") ||
    url.includes(".jpeg") ||
    url.includes(".png") ||
    url.includes(".gif") ||
    url.includes(".webp")
  ) {
    return "image"
  }

  // Default to video for backwards compatibility
  return "video"
}

// Inline VideoRow component
function InlineVideoRow({
  title,
  videos,
  limit = 10,
  isShowcase = false,
  showcaseId,
  isCreatorUploads = false,
  onRefresh,
}: {
  title: string
  videos: any[]
  limit?: number
  isShowcase?: boolean
  showcaseId?: string
  isCreatorUploads?: boolean
  onRefresh?: () => void
}) {
  const [visibleVideos, setVisibleVideos] = useState<any[]>([])
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [maxScroll, setMaxScroll] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { isProUser } = useUserPlan()

  // Create a URL-friendly name
  const slug = encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"))

  // Determine the correct link path based on whether this is a showcase or tag
  const linkPath = isShowcase && showcaseId ? `/showcase/${showcaseId}` : `/category/${slug}`

  // Determine button text based on category name
  const buttonText = title.toLowerCase() === "browse all" ? "Browse all" : "See all"

  // Handle manual refresh for creator uploads
  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return

    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Use Intersection Observer to load videos only when row is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsIntersecting(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }, // Load when within 200px of viewport
    )

    if (rowRef.current) {
      observer.observe(rowRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  // Load videos when row becomes visible
  useEffect(() => {
    if (isIntersecting && videos) {
      let filteredVideos = videos

      if (isCreatorUploads) {
        filteredVideos = videos.filter((video) => {
          const contentType = detectCreatorUploadContentType(video)
          return contentType === "video"
        })
        console.log(`[v0] Filtered creator uploads: ${videos.length} -> ${filteredVideos.length} (videos only)`)
      }

      // All users get shuffled videos for dynamic experience
      const shuffledVideos = shuffleArray([...filteredVideos], Math.random()).slice(0, limit)
      setVisibleVideos(shuffledVideos)
    }
  }, [isIntersecting, videos, limit, isCreatorUploads])

  // Calculate max scroll position
  useEffect(() => {
    const calculateMaxScroll = () => {
      if (scrollContainerRef.current) {
        const containerWidth = scrollContainerRef.current.clientWidth
        const scrollWidth = scrollContainerRef.current.scrollWidth
        setMaxScroll(Math.max(0, scrollWidth - containerWidth))
      }
    }

    calculateMaxScroll()
    window.addEventListener("resize", calculateMaxScroll)

    return () => {
      window.removeEventListener("resize", calculateMaxScroll)
    }
  }, [visibleVideos])

  // Handle scroll buttons
  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth
      const scrollAmount = containerWidth * 0.8

      const newPosition =
        direction === "left"
          ? Math.max(0, scrollPosition - scrollAmount)
          : Math.min(maxScroll, scrollPosition + scrollAmount)

      scrollContainerRef.current.scrollTo({
        left: newPosition,
        behavior: "smooth",
      })

      setScrollPosition(newPosition)
    }
  }

  // Update scroll position on manual scroll
  const handleManualScroll = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft)
    }
  }

  if (!videos || videos.length === 0) {
    return null
  }

  const hasMore = videos.length > limit

  return (
    <section
      className="mb-12 category-section"
      ref={rowRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="px-6 mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-extralight tracking-wider text-white category-title group-hover:text-crimson transition-colors duration-300">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {/* Manual refresh button for creator uploads */}
          {isCreatorUploads && onRefresh && (
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              disabled={isRefreshing}
              className="text-zinc-400 hover:text-white hover:bg-zinc-900/50 rounded-full px-3 py-1 transition-all duration-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          )}
          {hasMore && !isCreatorUploads && (
            <Link
              href={linkPath}
              className="text-zinc-400 hover:text-white flex items-center group bg-zinc-900/30 hover:bg-zinc-900/50 px-3 py-1 rounded-full transition-all duration-300"
            >
              <span className="mr-1 text-sm">{buttonText}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>
      <div className="relative">
        {/* Left scroll button */}
        {scrollPosition > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.2 }}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full h-8 w-8 shadow-lg"
              onClick={() => handleScroll("left")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {/* Right scroll button */}
        {scrollPosition < maxScroll && maxScroll > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.2 }}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full h-8 w-8 shadow-lg"
              onClick={() => handleScroll("right")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide gap-4 px-6 py-4"
          onScroll={handleManualScroll}
        >
          {isIntersecting
            ? visibleVideos.map((video, index) => {
                return (
                  <motion.div
                    key={video.uri || video.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="pt-1"
                  >
                    {isCreatorUploads ? (
                      <InlineCreatorUploadCard
                        video={{
                          id: video.uri?.split("/").pop() || video.id || "",
                          title: video.name || video.title || "Untitled",
                          fileUrl: video.link || video.fileUrl || "",
                          thumbnailUrl: video.pictures?.sizes?.[0]?.link || video.thumbnailUrl,
                          creatorName: video.user?.name || video.creatorName,
                          uid: video.user?.uri?.split("/").pop() || video.uid,
                          views: video.stats?.plays || video.views,
                        }}
                      />
                    ) : (
                      <InlineVimeoCard video={video} />
                    )}
                  </motion.div>
                )
              })
            : // Show skeleton loaders while waiting for intersection
              Array.from({ length: Math.min(limit, 10) }).map((_, index) => (
                <div key={index} className="pt-1">
                  <VideoSkeleton />
                </div>
              ))}
        </div>
      </div>
    </section>
  )
}

export default function ExplorePage() {
  // Get search query from URL
  const searchParams = useSearchParams()
  const searchQuery = searchParams?.get("search") || ""

  // State to store the filtered videos
  const [filteredShowcaseVideos, setFilteredShowcaseVideos] = useState<Record<string, any[]>>({})
  const [hasSearchResults, setHasSearchResults] = useState(false)
  const [featuredVideos, setFeaturedVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Get user plan
  const { isProUser } = useUserPlan()

  // Fetch showcase-based videos
  const { showcaseVideos, showcaseIds, loading: loadingShowcases, error: showcaseError } = useVimeoShowcases()

  // Fetch all videos for comprehensive search
  const { videos, videosByTag, loading: loadingVideos } = useVimeoVideos()

  // Fetch creator uploads
  const { videos: creatorUploads, loading: creatorUploadsLoading, refetch: refetchCreatorUploads } = useCreatorUploads()

  const router = useRouter()

  // Cleanup observer on unmount
  const observer = useRef<IntersectionObserver | null>(null)
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [])

  // Debug creator uploads
  useEffect(() => {
    console.log("🎬 [Explore] Creator uploads debug:", {
      loading: creatorUploadsLoading,
      videosCount: creatorUploads?.length || 0,
      videos: creatorUploads,
    })
  }, [creatorUploads, creatorUploadsLoading])

  // Filter videos based on search query
  useEffect(() => {
    if (searchQuery && !loadingShowcases && !loadingVideos) {
      // Filter showcase videos
      const filteredShowcases = filterCategoriesBySearch(showcaseVideos, searchQuery)

      // For pro users, shuffle each category's videos
      if (isProUser) {
        const shuffledShowcases: Record<string, any[]> = {}
        Object.entries(filteredShowcases).forEach(([key, videos]) => {
          shuffledShowcases[key] = shuffleArray([...videos], Math.random())
        })
        setFilteredShowcaseVideos(shuffledShowcases)
      } else {
        setFilteredShowcaseVideos(filteredShowcases)
      }

      // Check if we have any search results
      const hasResults = Object.keys(filteredShowcases).length > 0
      setHasSearchResults(hasResults)
    } else {
      // If no search query, show all showcase videos
      if (isProUser) {
        // For pro users, shuffle each category's videos
        const shuffledShowcases: Record<string, any[]> = {}
        Object.entries(showcaseVideos || {}).forEach(([key, videos]) => {
          shuffledShowcases[key] = shuffleArray([...videos], Math.random())
        })
        setFilteredShowcaseVideos(shuffledShowcases)
      } else {
        setFilteredShowcaseVideos(showcaseVideos || {})
      }

      setHasSearchResults(Object.keys(showcaseVideos || {}).length > 0)
    }
  }, [searchQuery, showcaseVideos, loadingShowcases, loadingVideos, videosByTag, videos, isProUser])

  // Get showcase names based on whether we're searching or not
  const showcaseNames = Object.keys(searchQuery ? filteredShowcaseVideos : showcaseVideos || {})

  // Prepare featured videos from all showcases
  useEffect(() => {
    if (!loadingShowcases && !loadingVideos && showcaseVideos && Object.keys(showcaseVideos).length > 0) {
      // Collect videos from all showcases (not all videos from account)
      const allShowcaseVideos = Object.values(showcaseVideos).flat()

      // Both free and pro users get shuffled videos in the featured section
      // But use a different random seed each time for maximum randomness
      if (allShowcaseVideos.length > 0) {
        setFeaturedVideos(shuffleArray(allShowcaseVideos, Math.random()).slice(0, 6))
      }

      setIsLoading(false)
    }
  }, [showcaseVideos, loadingShowcases, loadingVideos])

  // Check if we're still loading initial data
  const isLoadingData = (loadingShowcases || loadingVideos) && showcaseNames.length === 0

  // Check for errors
  const error = showcaseError

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1.0],
      },
    },
  }

  // Check if we have the specific showcases - add null checks
  const hasMindset = showcaseNames.some(
    (name) =>
      name &&
      (name.toLowerCase().includes("mindset") ||
        name.toLowerCase().includes("introspection") ||
        name.toLowerCase().includes("reflection") ||
        name.toLowerCase().includes("mindfulness")),
  )

  const hasHustleMentality = showcaseNames.some(
    (name) =>
      name &&
      (name.toLowerCase().includes("hustle") ||
        name.toLowerCase().includes("grind") ||
        name.toLowerCase().includes("entrepreneur")),
  )

  const hasCinema = showcaseNames.some(
    (name) => name && (name.toLowerCase().includes("cinema") || name.toLowerCase().includes("film")),
  )

  // Quick category navigation
  const quickCategories = [
    {
      name: "Mindset",
      icon: <Brain className="h-4 w-4 md:h-5 md:w-5" />,
      href: "/category/mindset",
      premium: false,
    },
    {
      name: "Hustle",
      icon: <Rocket className="h-4 w-4 md:h-5 md:w-5" />,
      href: "/category/hustle-mentality",
      premium: false,
    },
    {
      name: "Cinema",
      icon: <Film className="h-4 w-4 md:h-5 md:w-5" />,
      href: "/category/cinema",
      premium: false,
    },
    {
      name: "Recent",
      icon: <Clock className="h-4 w-4 md:h-5 md:w-5" />,
      href: "/category/recently-added",
      premium: true, // Mark this as premium
    },
  ]

  const { remainingDownloads, isProUser: isPro, hasReachedLimit } = useDownloadLimit()

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Explore Content</h1>
          <p className="text-zinc-400 mt-1">Discover amazing content from creators</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Minimal Download Counter */}
          {!isPro && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                hasReachedLimit
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-zinc-800/50 text-zinc-300 border border-zinc-700/50"
              }`}
            >
              <Download className="h-3 w-3" />
              <span>{remainingDownloads}/15</span>
            </div>
          )}

          {/* Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const query = formData.get("search") as string
              if (query && query.trim()) {
                router.push(`/dashboard/explore?search=${encodeURIComponent(query.trim())}`)
              }
            }}
            className="w-full md:w-96"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
              <input
                type="text"
                name="search"
                placeholder="Search videos..."
                defaultValue={searchQuery}
                className="w-full py-2.5 pl-10 pr-4 bg-zinc-900/60 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Search Results Header (if searching) */}
      {searchQuery && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6 shadow-xl">
            <h2 className="text-2xl font-light tracking-wider text-white mb-2 flex items-center">
              <Search className="h-5 w-5 mr-2 text-zinc-400" />
              Results for "{searchQuery}"
            </h2>
            <p className="text-zinc-400">
              {hasSearchResults
                ? `Found results in ${Object.keys(filteredShowcaseVideos).length} categories`
                : "No results found. Try a different search term."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Featured Section (if not searching) */}
      {!searchQuery && !isLoadingData && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light tracking-tight text-white">
              <span className="text-gradient-accent">Featured</span> Clips
            </h2>
            <Button
              onClick={() => router.push(isProUser ? "/category/browse-all" : "/dashboard/membership")}
              variant="ghost"
              className="text-zinc-400 hover:text-white hover:bg-zinc-900/50 rounded-full px-4 py-2 transition-all duration-300"
            >
              {isProUser ? (
                <>
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Upgrade <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </motion.div>

          {/* Featured Videos Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            {isLoading
              ? // Skeleton loaders
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="aspect-[9/16] rounded-xl bg-zinc-900/50 animate-pulse"
                  ></div>
                ))
              : // Featured videos
                featuredVideos.map((video, index) => (
                  <div key={`featured-${video.uri || index}`} className="group">
                    <InlineVimeoCard video={video} />
                  </div>
                ))}
          </motion.div>
        </motion.div>
      )}

      {/* Category Quick Links (if not searching) */}
      {!searchQuery && !isLoadingData && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.h3
            variants={itemVariants}
            className="text-xl font-light tracking-tight text-white mb-4 flex items-center"
          >
            <TrendingUp className="h-4 w-4 mr-2 text-zinc-400" />
            Trending Categories
          </motion.h3>

          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {quickCategories.map((category, index) => {
              // If category is premium and user is not pro, show locked version
              if (category.premium && !isProUser) {
                return (
                  <Button
                    key={category.name}
                    onClick={() => router.push("/dashboard/membership")}
                    variant="outline"
                    className="flex items-center justify-start h-auto py-4 px-5 bg-zinc-900/30 backdrop-blur-sm border-zinc-800/50 hover:bg-zinc-900/50 hover:border-zinc-700 rounded-xl transition-all duration-300"
                  >
                    <div className="p-2 rounded-full bg-black/30 mr-3 text-crimson">
                      <Lock className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <div className="text-left">
                      <span className="font-light text-sm md:text-base">{category.name}</span>
                      <span className="block text-xs text-zinc-500">Pro Only</span>
                    </div>
                  </Button>
                )
              }

              // Otherwise show normal category button
              return (
                <Button
                  key={category.name}
                  onClick={() => {
                    setActiveCategory(category.name)
                    router.push(category.href)
                  }}
                  variant="outline"
                  className={`flex items-center justify-start h-auto py-4 px-5 bg-zinc-900/30 backdrop-blur-sm border-zinc-800/50 hover:bg-zinc-900/50 hover:border-zinc-700 rounded-xl transition-all duration-300 ${
                    activeCategory === category.name ? "border-crimson/50 bg-crimson/5" : ""
                  }`}
                >
                  <div
                    className={`p-2 rounded-full bg-black/30 mr-3 ${activeCategory === category.name ? "text-crimson" : "text-crimson"}`}
                  >
                    {category.icon}
                  </div>
                  <span className="text-left font-light text-sm md:text-base">{category.name}</span>
                </Button>
              )
            })}
          </motion.div>
        </motion.div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-10 text-center">
          <p className="text-red-500">Error loading videos: {error}</p>
        </div>
      )}

      {/* Loading state (initial) */}
      {isLoadingData && (
        <div>
          <div className="h-8 w-48 bg-zinc-900/50 rounded-md animate-pulse mb-8"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="aspect-[9/16] rounded-xl bg-zinc-900/50 animate-pulse"></div>
            ))}
          </div>
        </div>
      )}

      {/* Creator Uploads Row */}
      {!creatorUploadsLoading && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants}>
            {creatorUploads && creatorUploads.length > 0 ? (
              <InlineVideoRow title="Creator Uploads" videos={creatorUploads} limit={20} isCreatorUploads={true} />
            ) : (
              <div className="px-6 py-4 bg-zinc-900/30 rounded-xl">
                <h3 className="text-lg font-light text-white mb-2">Creator Uploads</h3>
                <p className="text-zinc-400 text-sm">
                  No creator uploads found.{" "}
                  {creatorUploads ? `Found ${creatorUploads.length} videos` : "No data loaded"}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Loading state for Creator Uploads */}
      {creatorUploadsLoading && (
        <div className="px-6 py-4 bg-zinc-900/30 rounded-xl">
          <h3 className="text-lg font-light text-white mb-2">Creator Uploads</h3>
          <p className="text-zinc-400 text-sm">Loading creator uploads...</p>
        </div>
      )}

      {/* Showcase-based categories */}
      {showcaseNames.length > 0 && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-12">
          {showcaseNames.map((showcaseName, index) => {
            const videosToShow = searchQuery
              ? filteredShowcaseVideos[showcaseName]
              : (showcaseVideos || {})[showcaseName]
            return (
              <motion.div key={`showcase-${showcaseName}`} variants={itemVariants}>
                <InlineVideoRow
                  title={showcaseName}
                  videos={videosToShow || []}
                  limit={10}
                  isShowcase={true}
                  showcaseId={(showcaseIds || {})[showcaseName]}
                />
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* No videos state */}
      {!isLoadingData && showcaseNames.length === 0 && (
        <div className="py-10 text-center">
          {searchQuery ? (
            <p className="text-zinc-400">No videos found matching "{searchQuery}". Try a different search term.</p>
          ) : (
            <p className="text-zinc-400">
              No videos found. Make sure your Vimeo account has videos and your API credentials are correct.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
