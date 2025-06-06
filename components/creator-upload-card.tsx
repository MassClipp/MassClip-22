"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Download, Lock, Heart, Play, Pause, User } from "lucide-react"
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
  getDoc,
} from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { useRouter } from "next/navigation"

interface CreatorUploadCardProps {
  video: {
    id: string
    title: string
    fileUrl: string
    thumbnailUrl?: string
    creatorName?: string
    uid?: string
    views?: number
    downloads?: number
    username?: string
    userDisplayName?: string
  }
}

export default function CreatorUploadCard({ video }: CreatorUploadCardProps) {
  const [downloadError, setDownloadError] = useState(false)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isCheckingFavorite, setIsCheckingFavorite] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [creatorUsername, setCreatorUsername] = useState<string | null>(null)
  const [creatorDisplayName, setCreatorDisplayName] = useState<string | null>(null)
  const [isLoadingCreatorData, setIsLoadingCreatorData] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const { planData } = useUserPlan()
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()
  const router = useRouter()

  // Fetch current creator data from Firestore users collection
  useEffect(() => {
    const fetchCreatorData = async () => {
      setIsLoadingCreatorData(true)

      if (!video.uid) {
        console.log("No UID provided for video:", video.id)
        // Fallback to existing data if no UID
        setCreatorUsername(video.username || video.creatorName?.toLowerCase().replace(/\s+/g, "") || "unknown")
        setCreatorDisplayName(video.userDisplayName || video.creatorName || "Creator")
        setIsLoadingCreatorData(false)
        return
      }

      try {
        console.log("Fetching creator data for UID:", video.uid)

        // Get the user document directly by UID for most current data
        const userDocRef = doc(db, "users", video.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()

          console.log("Found user data:", {
            uid: video.uid,
            username: userData.username,
            displayName: userData.displayName,
            email: userData.email,
          })

          // Use the current data from Firestore - prioritize username, fallback to displayName
          const currentUsername =
            userData.username || userData.displayName?.toLowerCase().replace(/\s+/g, "") || "unknown"
          const currentDisplayName = userData.displayName || userData.username || "Creator"

          setCreatorUsername(currentUsername)
          setCreatorDisplayName(currentDisplayName)

          console.log("Set creator data:", {
            username: currentUsername,
            displayName: currentDisplayName,
          })
        } else {
          console.log("User document not found for UID:", video.uid)
          // Fallback to existing data
          setCreatorUsername(video.username || video.creatorName?.toLowerCase().replace(/\s+/g, "") || "unknown")
          setCreatorDisplayName(video.userDisplayName || video.creatorName || "Creator")
        }
      } catch (error) {
        console.error("Error fetching creator data:", error)
        // Fallback to existing data
        setCreatorUsername(video.username || video.creatorName?.toLowerCase().replace(/\s+/g, "") || "unknown")
        setCreatorDisplayName(video.userDisplayName || video.creatorName || "Creator")
      } finally {
        setIsLoadingCreatorData(false)
      }
    }

    fetchCreatorData()
  }, [video.uid, video.username, video.creatorName, video.userDisplayName, video.id])

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

  // Handle creator profile navigation
  const handleCreatorClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Use the fetched current username from Firestore
    const username = creatorUsername || "unknown"
    console.log("Navigating to creator profile:", username, "for UID:", video.uid)
    router.push(`/creator/${username}`)
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
      // Pause all other videos first
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

        // Debug log to see what we're trying to save
        console.log("Saving creator upload to favorites:", safeVideo)

        // Remove any undefined values just to be extra safe
        const cleanVideo = Object.fromEntries(Object.entries(safeVideo).filter(([_, value]) => value !== undefined))

        console.log("Clean video object:", cleanVideo)

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
        {/* Video container with 9:16 aspect ratio and curved borders */}
        <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 shadow-md">
          {/* Creator Profile Badge - Top Right */}
          <div className="absolute top-2 right-2 z-30">
            <button
              onClick={handleCreatorClick}
              className="flex items-center bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white text-xs px-2 py-1 rounded-full transition-all duration-200 border border-white/10 hover:border-white/20"
              aria-label={`View ${creatorDisplayName || "creator"}'s profile`}
              title={`View ${creatorDisplayName || "creator"}'s profile`}
              disabled={isLoadingCreatorData}
            >
              <User className="w-3 h-3 mr-1" />
              <span className="font-medium truncate max-w-[60px] sm:max-w-[80px]">
                {isLoadingCreatorData ? "Loading..." : creatorDisplayName || "Creator"}
              </span>
            </button>
          </div>

          {/* Raw video element - this will show the first frame as thumbnail */}
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

          {/* Play/Pause button - only show on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:bg-black/70"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
          </div>

          {/* Overlay gradient for better visibility - only on hover */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

          {/* Action buttons overlay */}
          <div className="absolute bottom-2 left-2 right-2 z-30 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* Download button - show lock when limit reached */}
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
        </div>
      </div>

      {/* Title */}
      <div className="mt-2 text-xs text-zinc-300 min-h-[2.5rem] line-clamp-2 font-light" title={video.title}>
        {video.title || "Untitled video"}
      </div>
    </div>
  )
}
