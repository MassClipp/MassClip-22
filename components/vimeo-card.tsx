"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Download, Lock, Heart, ExternalLink } from "lucide-react"
import type { VimeoVideo } from "@/lib/types"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { trackFirestoreWrite } from "@/lib/firestore-optimizer"
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
import { useUserPlan } from "@/hooks/use-user-plan"
import { useMobile } from "@/hooks/use-mobile"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { isInTikTokBrowser } from "@/lib/browser-detection"
import { VideoWatermark } from "@/components/video-watermark"

interface VimeoCardProps {
  video: VimeoVideo
}

export default function VimeoCard({ video }: VimeoCardProps) {
  const [isActive, setIsActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [isIframeLoaded, setIsIframeLoaded] = useState(false)
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadLink, setDownloadLink] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isCheckingFavorite, setIsCheckingFavorite] = useState(true)
  const [isTikTokBrowser, setIsTikTokBrowser] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()
  const { planData } = useUserPlan()
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()
  const isMobile = useMobile()
  const titleRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLIFrameElement>(null)
  const viewTrackedRef = useRef(false)
  const downloadFrameRef = useRef<HTMLIFrameElement | null>(null)
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  // Extract video ID from URI (format: "/videos/12345678") with null check
  const videoId = video?.uri ? video.uri.split("/").pop() : null

  // Check if we're in TikTok browser on mount
  useEffect(() => {
    setIsTikTokBrowser(isInTikTokBrowser())
  }, [])

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

  // Clean up any iframe elements on unmount
  useEffect(() => {
    return () => {
      if (downloadFrameRef.current && downloadFrameRef.current.parentNode) {
        downloadFrameRef.current.parentNode.removeChild(downloadFrameRef.current)
      }
    }
  }, [])

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

  // Check if title is overflowing
  useEffect(() => {
    const checkOverflow = () => {
      if (titleRef.current) {
        const isOverflowing = titleRef.current.scrollWidth > titleRef.current.clientWidth
        setIsTitleOverflowing(isOverflowing)
      }
    }

    checkOverflow()

    const handleResize = () => {
      checkOverflow()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [video?.name])

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

    // Creator Pro users don't need to track downloads
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
      const filename = `${video?.name?.replace(/[^\w\s]/gi, "") || "video"}.mp4`

      if (isMobile) {
        // Mobile download approach - keep using iframe for mobile
        const iframe = document.createElement("iframe")
        iframe.style.display = "none"
        document.body.appendChild(iframe)
        downloadFrameRef.current = iframe
        iframe.src = downloadLink

        // Clean up iframe
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe)
          }
          downloadFrameRef.current = null
        }, 5000)
      } else {
        // Desktop download - use direct download approach
        const success = await startDirectDownload(downloadLink, filename)

        if (!success) {
          // Fallback to traditional method if direct download fails
          if (downloadLinkRef.current) {
            downloadLinkRef.current.href = downloadLink
            downloadLinkRef.current.download = filename
            downloadLinkRef.current.click()
          }
        }
      }

      // 7. If pro user, record the download after (doesn't affect permissions)
      if (isProUser) {
        recordDownload().catch((error) => {
          console.error("Error recording pro user download:", error)
        })
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

  // Handle opening in external browser
  const handleOpenExternal = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Try to open the current URL in the device's default browser
    const currentUrl = window.location.href
    window.open(currentUrl, "_blank")
  }

  // If video is null or undefined, render a placeholder
  if (!video) {
    return (
      <div className="flex-shrink-0 w-[160px]">
        <div
          style={{
            position: "relative",
            paddingBottom: "177.78%", // 9:16 aspect ratio
            height: 0,
            borderRadius: "8px",
            overflow: "hidden",
            backgroundColor: "#111",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-zinc-500">Video unavailable</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-zinc-400 truncate">Unavailable</div>
      </div>
    )
  }

  const thumbnailUrl = getHighQualityThumbnail()

  // Modify the iframe src for TikTok browsers to disable fullscreen
  const getVideoSrc = () => {
    const baseUrl = `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479&quality=1080p`

    // For TikTok browsers, add parameters to restrict behavior
    if (isTikTokBrowser) {
      return `${baseUrl}&playsinline=1&transparent=0`
    }

    return baseUrl
  }

  return (
    <div className="flex-shrink-0 w-[160px]">
      <div
        className="group relative premium-hover-effect"
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
        {/* Border overlay that appears on hover/click */}
        <div
          className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-300"
          style={{
            opacity: isActive ? 1 : 0,
            border: "1px solid rgba(220, 20, 60, 0.5)",
            borderRadius: "8px",
            boxShadow: "0 0 20px rgba(220, 20, 60, 0.2)",
          }}
        ></div>

        {/* Action buttons container */}
        <div
          className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between transition-opacity duration-300"
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          {/* Download button - visually disabled when limit reached */}
          <button
            className={`${
              hasReachedLimit ? "bg-zinc-800/90 cursor-not-allowed" : "bg-black/70 hover:bg-black/90"
            } p-1.5 rounded-full transition-all duration-300 ${downloadError ? "ring-1 ring-red-500" : ""}`}
            onClick={handleDownload}
            aria-label={hasReachedLimit ? "Download limit reached" : "Download video"}
            disabled={isDownloading || hasReachedLimit}
            title={hasReachedLimit ? "Upgrade to Creator Pro for unlimited downloads" : "Download video"}
          >
            {hasReachedLimit ? (
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

        {/* TikTok-specific "Open in browser" button */}
        {isTikTokBrowser && (
          <div className="absolute top-2 right-2 z-30">
            <button
              onClick={handleOpenExternal}
              className="bg-white/90 hover:bg-white text-black text-xs px-2 py-1 rounded-full flex items-center space-x-1"
              aria-label="Open in browser"
            >
              <ExternalLink size={10} />
              <span className="text-[10px]">Open</span>
            </button>
          </div>
        )}

        {videoId ? (
          <div className="absolute inset-0 video-container" ref={videoContainerRef}>
            {/* Watermark - Added here */}
            <VideoWatermark position="bottom-right" className="video-watermark" />

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
                allow={
                  isTikTokBrowser
                    ? "autoplay; picture-in-picture; clipboard-write; encrypted-media"
                    : "autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                }
                title={video.name || "Video"}
                loading="lazy"
                onLoad={handleIframeLoad}
                className={isTikTokBrowser ? "tiktok-restricted-iframe" : ""}
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
        ref={titleRef}
        className="mt-2 text-xs text-zinc-300 min-h-[2.5rem] line-clamp-2 font-light"
        title={video.name || "Untitled video"}
      >
        {video.name || "Untitled video"}
      </div>
    </div>
  )
}

// Named export for compatibility
export { VimeoCard }
