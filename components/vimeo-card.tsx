"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
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
import { Card, CardContent } from "@/components/ui/card"
import { useInView } from "react-intersection-observer"
import { useTikTokDetection } from "@/hooks/use-tiktok-detection"

interface VimeoCardProps {
  video: VimeoVideo
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  controls?: boolean
  responsive?: boolean
  dnt?: boolean
  onPlay?: () => void
  className?: string
  aspectRatio?: "16:9" | "1:1" | "4:3" | "9:16"
  priority?: boolean
}

export default function VimeoCard({
  video,
  autoPlay = false,
  muted = true,
  loop = true,
  controls = true,
  responsive = true,
  dnt = true,
  onPlay,
  className = "",
  aspectRatio = "16:9",
  priority = false,
}: VimeoCardProps) {
  const [isActive, setIsActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [isIframeLoaded, setIsIframeLoaded] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadLink, setDownloadLink] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isCheckingFavorite, setIsCheckingFavorite] = useState(true)
  const [isTikTokBrowserOriginal, setIsTikTokBrowserOriginal] = useState(false)

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
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const { isTikTokBrowser } = useTikTokDetection()

  // Extract video ID from URI (format: "/videos/12345678") with null check
  const videoId = video?.uri ? video.uri.split("/").pop() : null

  // Check if we're in TikTok browser on mount
  useEffect(() => {
    setIsTikTokBrowserOriginal(isInTikTokBrowser())
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
    if (isTikTokBrowserOriginal) {
      return `${baseUrl}&playsinline=1&transparent=0`
    }

    return baseUrl
  }

  const { ref, inView } = useInView({
    threshold: 0.5,
    triggerOnce: false,
  })

  // Determine aspect ratio class
  const aspectRatioClass = {
    "16:9": "aspect-video",
    "1:1": "aspect-square",
    "4:3": "aspect-[4/3]",
    "9:16": "aspect-[9/16]",
  }[aspectRatio]

  return (
    <Card ref={ref} className={`overflow-hidden ${className}`}>
      <CardContent className="p-0 relative">
        <div
          ref={videoContainerRef}
          className={`relative group cursor-pointer ${aspectRatioClass}`}
          onClick={() => setIsActive(!isActive)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Video thumbnail */}
          {!isPlaying && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 opacity-0 group-hover:opacity-100"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 opacity-0 group-hover:opacity-100"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-12 h-12 text-white/80 transition-transform duration-300 transform group-hover:scale-110"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.5 5.653c0-1.426 1.529-2.333 2.77-1.664l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.27 19.911c-1.241.67-2.77-.236-2.77-1.664V5.653z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Video iframe */}
          <iframe
            ref={iframeRef}
            src={getVideoSrc()}
            className={`absolute inset-0 w-full h-full bg-black ${isPlaying ? "z-10" : "z-0"}`}
            frameBorder="0"
            allow={`autoplay; fullscreen; picture-in-picture ${!isTikTokBrowser ? "; fullscreen" : ""}`}
            allowFullScreen={!isTikTokBrowser}
            loading={priority ? "eager" : "lazy"}
          />
        </div>
      </CardContent>
    </Card>
  )
}
