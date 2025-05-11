"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Download, Lock, Heart } from "lucide-react"
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
import VideoPlayer from "./video-player"

interface Video {
  id: string
  title: string
  description?: string
  thumbnailUrl: string
  videoUrl: string
  downloadUrl?: string
  tags?: string[]
}

interface VideoCardProps {
  video: Video
}

export default function VideoCard({ video }: VideoCardProps) {
  const [isActive, setIsActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isCheckingFavorite, setIsCheckingFavorite] = useState(true)
  const [showFullPlayer, setShowFullPlayer] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()
  const { planData } = useUserPlan()
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()
  const isMobile = useMobile()
  const titleRef = useRef<HTMLDivElement>(null)
  const viewTrackedRef = useRef(false)
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  // Check if video is in favorites
  useEffect(() => {
    const checkIfFavorite = async () => {
      if (!user || !video.id) {
        setIsCheckingFavorite(false)
        return
      }

      try {
        // Query for this video in user's favorites
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
  }, [video?.title])

  // Track video view when active
  useEffect(() => {
    const trackVideoView = async () => {
      if (!user || !isActive || viewTrackedRef.current || !video.id) return

      try {
        // Add to user's history subcollection
        await addDoc(collection(db, `users/${user.uid}/history`), {
          videoId: video.id,
          video: {
            uri: `/videos/${video.id}`,
            name: video.title,
            description: video.description || "",
            link: video.videoUrl,
            pictures: {
              sizes: [
                {
                  width: 1280,
                  height: 720,
                  link: video.thumbnailUrl,
                },
              ],
            },
            tags: video.tags?.map((tag) => ({ name: tag })) || [],
            download: video.downloadUrl ? [{ link: video.downloadUrl }] : [],
          },
          viewedAt: serverTimestamp(),
        })

        // Track the write operation
        trackFirestoreWrite("VideoCard-trackView", 1)

        viewTrackedRef.current = true
        setHasTrackedView(true)
      } catch (err) {
        console.error("Error tracking video view:", err)
      }
    }

    trackVideoView()
  }, [user, video, isActive])

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
        // Find and remove from favorites
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
        // Add to favorites
        await addDoc(collection(db, `users/${user.uid}/favorites`), {
          videoId: video.id,
          video: {
            uri: `/videos/${video.id}`,
            name: video.title,
            description: video.description || "",
            link: video.videoUrl,
            pictures: {
              sizes: [
                {
                  width: 1280,
                  height: 720,
                  link: video.thumbnailUrl,
                },
              ],
            },
            tags: video.tags?.map((tag) => ({ name: tag })) || [],
            download: video.downloadUrl ? [{ link: video.downloadUrl }] : [],
          },
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

  // Handle download button click
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Prevent multiple clicks
    if (isDownloading) return

    setIsDownloading(true)

    try {
      // Basic authentication check
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to download videos",
          variant: "destructive",
        })
        return
      }

      // Check if download link exists
      if (!video.downloadUrl) {
        setDownloadError(true)
        toast({
          title: "Download Error",
          description: "No download links available for this video.",
          variant: "destructive",
        })
        return
      }

      // Creator Pro users bypass limit checks
      if (!isProUser) {
        // Strict limit check
        if (hasReachedLimit) {
          toast({
            title: "Download Limit Reached",
            description: "You've reached your monthly download limit. Upgrade for unlimited downloads.",
            variant: "destructive",
          })
          return
        }

        // Record the download FIRST for free users
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

      // Trigger the actual download
      const filename = `${video.title.replace(/[^\w\s]/gi, "") || "video"}.mp4`

      if (downloadLinkRef.current) {
        downloadLinkRef.current.href = video.downloadUrl
        downloadLinkRef.current.download = filename
        downloadLinkRef.current.click()
      }

      // If pro user, record the download after
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

  // Handle thumbnail load event
  const handleThumbnailLoad = () => {
    setThumbnailLoaded(true)
  }

  // Handle card click to show full player
  const handleCardClick = () => {
    setShowFullPlayer(true)
    setIsActive(true)
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

  return (
    <>
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
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleCardClick}
          ref={videoContainerRef}
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
              title={hasReachedLimit ? "Upgrade for unlimited downloads" : "Download video"}
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
                isFavorite ? "text-red-500" : "text-white"
              }`}
              onClick={toggleFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              disabled={isCheckingFavorite}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Thumbnail with play overlay */}
          <div className="absolute inset-0 video-card-thumbnail">
            <img
              src={video.thumbnailUrl || "/placeholder.svg"}
              alt={video.title}
              className="absolute inset-0 w-full h-full object-cover"
              onLoad={handleThumbnailLoad}
              crossOrigin="anonymous"
            />

            {/* Dark overlay with gradient for premium look */}
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${isHovered ? "opacity-30" : "opacity-50"}`}
              style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7))",
              }}
            ></div>

            {/* Play button overlay */}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-600/80 hover:bg-red-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="white"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div
          ref={titleRef}
          className="mt-2 text-xs text-zinc-300 min-h-[2.5rem] line-clamp-2 font-light"
          title={video.title || "Untitled video"}
        >
          {video.title || "Untitled video"}
        </div>
      </div>

      {/* Full video player modal */}
      {showFullPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-4xl">
            <VideoPlayer
              videoId={video.id}
              videoUrl={video.videoUrl}
              title={video.title}
              description={video.description}
              thumbnail={video.thumbnailUrl}
              downloadUrl={video.downloadUrl}
              tags={video.tags}
              onClose={() => setShowFullPlayer(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
