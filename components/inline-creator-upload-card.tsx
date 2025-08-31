"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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
  getDoc,
} from "firebase/firestore"
import { trackFirestoreWrite } from "@/lib/firestore-optimizer"
import { downloadFile } from "@/lib/download-helper"

export function InlineCreatorUploadCard({ video }: { video: any }) {
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
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()
  const router = useRouter()

  useEffect(() => {
    const fetchCreatorData = async () => {
      setIsLoadingCreatorData(true)

      if (!video.uid) {
        // Fallback to existing data if no UID
        setCreatorUsername(video.username || video.creatorName?.toLowerCase().replace(/\s+/g, "") || "unknown")
        setCreatorDisplayName(video.userDisplayName || video.creatorName || "Creator")
        setIsLoadingCreatorData(false)
        return
      }

      try {
        // Get the user document directly by UID for most current data
        const userDocRef = doc(db, "users", video.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()

          // Use the current data from Firestore - prioritize username, fallback to displayName
          const currentUsername =
            userData.username || userData.displayName?.toLowerCase().replace(/\s+/g, "") || "unknown"
          const currentDisplayName = userData.displayName || userData.username || "Creator"

          setCreatorUsername(currentUsername)
          setCreatorDisplayName(currentDisplayName)
        } else {
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

  const handleCreatorClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const username = creatorUsername || "unknown"
    router.push(`/creator/${username}`)
  }

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
        title: "Sign In Required",
        description: "Please sign in to save favorites",
        variant: "destructive",
      })
      router.push("/login")
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
    if (!user) return { success: true } // Allow anonymous downloads for free content

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

    if (user && !isProUser && hasReachedLimit) {
      toast({
        title: "Download Limit Reached",
        description: "You've reached your monthly download limit. Upgrade to Creator Pro for unlimited downloads.",
        variant: "destructive",
      })
      return
    }

    if (!video.fileUrl) {
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
      if (user) {
        const recordResult = await recordDownload()
        if (!recordResult.success) {
          toast({
            title: "Download Failed",
            description: recordResult.message,
            variant: "destructive",
          })
          return
        }
      }

      const filename = video.title ? `${video.title}.mp4` : "video.mp4"
      const success = await downloadFile(video.fileUrl, filename)

      if (success) {
        toast({
          title: "Download Started",
          description: `Downloading "${video.title}"`,
        })
      } else {
        throw new Error("Download failed")
      }
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

  return (
    <div
      className="flex-shrink-0 w-[160px] group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={togglePlay}
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
        {/* Video Element */}
        <video
          ref={videoRef}
          src={video.fileUrl}
          poster={video.thumbnailUrl}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          onPlay={() => {
            setIsPlaying(true)
            if (user) {
              trackVideoView()
            }
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={handleVideoEnd}
          muted
          playsInline
        />

        {/* Overlay Controls */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Top Controls */}
          <div className="absolute top-2 right-2 flex gap-1">
            {/* Favorite Button - Only show for logged-in users */}
            {user && (
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
            )}

            {/* Download Button - Always show for free content */}
            <button
              onClick={handleDownload}
              disabled={isDownloading || (user && !isProUser && hasReachedLimit)}
              className={`p-1.5 rounded-full backdrop-blur-sm transition-all duration-200 ${
                isDownloading
                  ? "bg-blue-500/80 text-white"
                  : user && !isProUser && hasReachedLimit
                    ? "bg-gray-500/40 text-gray-400 cursor-not-allowed"
                    : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white"
              }`}
            >
              <Download className={`h-3 w-3 ${isDownloading ? "animate-bounce" : ""}`} />
            </button>
          </div>

          {/* Play/Pause Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-2 rounded-full bg-black/40 backdrop-blur-sm">
              {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white" />}
            </div>
          </div>
        </div>
      </div>

      {/* Video Info */}
      <div className="mt-2 px-1">
        <h3 className="text-xs font-medium text-white line-clamp-2 leading-tight">{video.title || "Untitled"}</h3>
        <button
          onClick={handleCreatorClick}
          className="text-xs text-zinc-400 hover:text-white transition-colors mt-1 block"
          disabled={isLoadingCreatorData}
        >
          {isLoadingCreatorData ? "Loading..." : creatorDisplayName || "Creator"}
        </button>
        {video.views && <p className="text-xs text-zinc-400 mt-1">{video.views.toLocaleString()} views</p>}
      </div>
    </div>
  )
}
