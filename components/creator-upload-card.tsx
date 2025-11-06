"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Download, Play, Clock } from "lucide-react"
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
import { TrackingService } from "@/lib/tracking-service"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Video {
  id: string
  title: string
  fileUrl: string
  thumbnailUrl?: string
  creatorName: string
  uid: string
  views: number
  downloads: number
  duration?: string
  type?: string
}

interface CreatorUploadCardProps {
  video: Video
}

function CreatorUploadCard({ video }: CreatorUploadCardProps) {
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
  const [imageError, setImageError] = useState(false)

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

        // After successful download, add this tracking call:
        try {
          // Track the download
          await TrackingService.trackDownload(video.id, video.uid || "", user.uid)

          console.log("✅ Download tracked successfully")
        } catch (trackingError) {
          console.error("Error tracking download:", trackingError)
          // Don't fail the download if tracking fails
        }
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

  const handleImageError = () => {
    setImageError(true)
  }

  const handlePlay = () => {
    if (video.fileUrl) {
      window.open(video.fileUrl, "_blank")
    }
  }

  return (
    <Card
      className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all duration-200 cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-zinc-800 rounded-t-lg overflow-hidden">
          {video.thumbnailUrl && !imageError ? (
            <img
              src={video.thumbnailUrl || "/placeholder.svg"}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
              <Play className="w-8 h-8 text-zinc-600" />
            </div>
          )}

          {!isLoadingCreatorData && creatorDisplayName && (
            <button
              onClick={handleCreatorClick}
              className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full hover:bg-black/90 transition-all duration-200 z-10"
              title={`Visit ${creatorDisplayName}'s storefront`}
            >
              @{creatorUsername}
            </button>
          )}

          {/* Overlay */}
          <div
            className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-200 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={togglePlay} className="bg-white/20 hover:bg-white/30">
                <Play className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="secondary" onClick={handleDownload} className="bg-white/20 hover:bg-white/30">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Duration badge */}
          {video.duration && (
            <Badge className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1">
              <Clock className="w-3 h-3 mr-1" />
              {video.duration}
            </Badge>
          )}

          {/* Type badge */}
          {video.type && (
            <Badge className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1">
              {video.type.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Content Info */}
        <div className="p-3">
          <h3 className="font-medium text-white text-sm line-clamp-2 mb-2" title={video.title}>
            {video.title}
          </h3>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Play className="w-3 h-3" />
                {video.views.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {video.downloads.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Export both as default and named export
export default CreatorUploadCard
export { CreatorUploadCard }
