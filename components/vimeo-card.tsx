"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Download, Lock } from "lucide-react"
import type { VimeoVideo } from "@/lib/types"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { trackFirestoreWrite } from "@/lib/firestore-optimizer"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useMobile } from "@/hooks/use-mobile"

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

  const { user } = useAuth()
  const { toast } = useToast()
  const { isProUser, recordDownload, planData } = useUserPlan()
  const isMobile = useMobile()
  const titleRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLIFrameElement>(null)
  const viewTrackedRef = useRef(false)
  const downloadFrameRef = useRef<HTMLIFrameElement | null>(null)

  // Simple download limit check - free users get 5 downloads max
  const hasReachedLimit = !isProUser && planData && planData.downloads >= (planData.downloadsLimit || 5)

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

  // Clean up any iframe elements on unmount
  useEffect(() => {
    return () => {
      if (downloadFrameRef.current && downloadFrameRef.current.parentNode) {
        downloadFrameRef.current.parentNode.removeChild(downloadFrameRef.current)
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

  // Handle download button click - CRITICAL CHANGE: Check permissions BEFORE triggering download
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Set downloading state to prevent multiple clicks
    setIsDownloading(true)

    try {
      // Basic permission gates
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to download videos",
          variant: "destructive",
        })
        setIsDownloading(false)
        return
      }

      // CRITICAL: Check if download link exists before proceeding
      if (!downloadLink) {
        console.error("No download links available for this video")
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

        setIsDownloading(false)
        return
      }

      // CRITICAL CHANGE: Record the download FIRST, before triggering the actual download
      // This ensures we increment the count before allowing the download
      if (!isProUser) {
        // Check if this will be the last allowed download
        const isLastAllowedDownload = planData && planData.downloads === (planData.downloadsLimit || 5) - 1

        // Show warning for last download BEFORE starting the download
        if (isLastAllowedDownload) {
          toast({
            title: "Last Download",
            description: "This is your last download for the month. Upgrade to Pro for unlimited downloads.",
          })
        }

        // CRITICAL: Double-check limit again right before recording
        if (planData && planData.downloads >= (planData.downloadsLimit || 5)) {
          toast({
            title: "Download Limit Reached",
            description:
              "You have reached your free download limit for this month. Upgrade to Pro for unlimited downloads.",
            variant: "destructive",
          })
          setIsDownloading(false)
          return
        }

        // Record the download BEFORE triggering it
        const result = await recordDownload()

        // If recording failed, don't proceed with download
        if (!result.success) {
          toast({
            title: "Download Error",
            description: result.message || "Failed to record download. Please try again.",
            variant: "destructive",
          })
          setIsDownloading(false)
          return
        }
      }

      // Reset error state
      setDownloadError(false)

      // Only now, after all checks and recording, trigger the actual download
      if (isMobile) {
        // MOBILE: Use hidden iframe to prevent tab duplication
        const iframe = document.createElement("iframe")
        iframe.style.display = "none"
        document.body.appendChild(iframe)
        downloadFrameRef.current = iframe

        // Set the source to the download link
        iframe.src = downloadLink

        // Clean up the iframe after a delay
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe)
          }
          downloadFrameRef.current = null
        }, 5000)
      } else {
        // Desktop: Use hidden anchor element
        const a = document.createElement("a")
        a.href = downloadLink
        a.download = `${video?.name?.replace(/[^\w\s]/gi, "") || "video"}.mp4`
        a.target = "_blank"
        a.rel = "noopener noreferrer"
        document.body.appendChild(a)
        a.click()

        // Clean up
        setTimeout(() => {
          document.body.removeChild(a)
        }, 100)
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

  // Handle iframe load event
  const handleIframeLoad = () => {
    setIsIframeLoaded(true)
  }

  // Handle thumbnail load event
  const handleThumbnailLoad = () => {
    setThumbnailLoaded(true)
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
            borderRadius: "4px",
            overflow: "hidden",
            backgroundColor: "#111",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-gray-500">Video unavailable</span>
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-300 truncate">Unavailable</div>
      </div>
    )
  }

  const thumbnailUrl = getHighQualityThumbnail()

  return (
    <div className="flex-shrink-0 w-[160px]">
      <div
        className="group relative premium-hover-effect"
        style={{
          position: "relative",
          paddingBottom: "177.78%", // 9:16 aspect ratio
          height: 0,
          borderRadius: "4px",
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
            border: "1px solid #800020",
            borderRadius: "4px",
            boxShadow: "0 0 3px rgba(128, 0, 32, 0.5)",
          }}
        ></div>

        {/* Download button - visually disabled when limit reached */}
        <button
          className={`absolute bottom-2 left-2 z-20 ${
            hasReachedLimit ? "bg-gray-800/90 cursor-not-allowed" : "bg-black/70 hover:bg-black/90"
          } p-1.5 rounded-full transition-opacity duration-300 ${downloadError ? "ring-1 ring-red-500" : ""}`}
          style={{ opacity: isHovered ? 1 : 0 }}
          onClick={handleDownload}
          aria-label={hasReachedLimit ? "Download limit reached" : "Download video"}
          disabled={isDownloading || hasReachedLimit}
          title={hasReachedLimit ? "Upgrade to Pro for unlimited downloads" : "Download video"}
        >
          {hasReachedLimit ? (
            <Lock className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <Download className={`h-3.5 w-3.5 ${downloadError ? "text-red-500" : "text-white"}`} />
          )}
        </button>

        {videoId ? (
          <div className="absolute inset-0">
            {/* High-quality thumbnail with dark overlay */}
            {thumbnailUrl && (
              <div
                className={`absolute inset-0 video-card-thumbnail transition-all duration-300 ${
                  isActive && isIframeLoaded ? "opacity-0" : "opacity-100"
                }`}
                style={{
                  backgroundImage: `url(${thumbnailUrl})`,
                  backgroundColor: "#111",
                }}
              >
                {/* Dark overlay with gradient for premium look */}
                <div
                  className={`absolute inset-0 dark-overlay transition-opacity duration-300 ${
                    isHovered ? "opacity-30" : "opacity-50"
                  }`}
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
                src={`https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479&quality=1080p`}
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
            <span className="text-xs text-gray-500">Video unavailable</span>
          </div>
        )}
      </div>
      {/* Updated title div to allow wrapping */}
      <div
        ref={titleRef}
        className="mt-1 text-xs text-gray-300 min-h-[2.5rem] line-clamp-2"
        title={video.name || "Untitled video"}
      >
        {video.name || "Untitled video"}
      </div>
    </div>
  )
}
