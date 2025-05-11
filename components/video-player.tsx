"use client"

import type React from "react"

import { forwardRef, useRef, useEffect, useState } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, Download, Heart } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc } from "firebase/firestore"
import { trackFirestoreWrite } from "@/lib/firestore-optimizer"

interface VideoPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  videoId: string
  videoUrl: string
  title: string
  description?: string
  thumbnail?: string
  downloadUrl?: string
  onClose?: () => void
  tags?: string[]
  src: string
  poster?: string
  onLoadedData?: () => void
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  (
    {
      videoId,
      videoUrl,
      title,
      description,
      thumbnail,
      downloadUrl,
      onClose,
      tags = [],
      src,
      poster,
      onLoadedData,
      ...props
    },
    ref,
  ) => {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isFavorite, setIsFavorite] = useState(false)
    const [isCheckingFavorite, setIsCheckingFavorite] = useState(true)
    const [isDownloading, setIsDownloading] = useState(false)
    const [hasTrackedView, setHasTrackedView] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const videoRef = useRef<HTMLVideoElement>(null)
    const playerRef = useRef<HTMLDivElement>(null)
    const viewTrackedRef = useRef(false)
    const localRef = useRef<HTMLVideoElement>(null)
    const videoRef2 = (ref as React.RefObject<HTMLVideoElement>) || localRef

    const { user } = useAuth()
    const { toast } = useToast()
    const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()

    // Format time (seconds) to MM:SS
    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60)
      const seconds = Math.floor(time % 60)
      return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
    }

    useEffect(() => {
      const video = videoRef2.current
      if (!video) return

      const handleError = (e: ErrorEvent) => {
        console.error("Video error:", e)
        setError("Failed to load video")
      }

      const handleLoad = () => {
        setError(null)
        if (onLoadedData) onLoadedData()
      }

      video.addEventListener("error", handleError as EventListener)
      video.addEventListener("loadeddata", handleLoad)

      return () => {
        video.removeEventListener("error", handleError as EventListener)
        video.removeEventListener("loadeddata", handleLoad)
      }
    }, [videoRef2, onLoadedData])

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

    // Track video view when played
    useEffect(() => {
      const trackVideoView = async () => {
        if (!user || viewTrackedRef.current || !videoId) return

        try {
          // Add to user's history subcollection
          await addDoc(collection(db, `users/${user.uid}/history`), {
            videoId: videoId,
            video: {
              uri: `/videos/${videoId}`,
              name: title,
              description: description || "",
              link: videoUrl,
              pictures: {
                sizes: [
                  {
                    width: 1280,
                    height: 720,
                    link: thumbnail || "",
                  },
                ],
              },
              tags: tags.map((tag) => ({ name: tag })),
              download: downloadUrl ? [{ link: downloadUrl }] : [],
            },
            viewedAt: serverTimestamp(),
          })

          // Track the write operation
          trackFirestoreWrite("VideoPlayer-trackView", 1)

          viewTrackedRef.current = true
          setHasTrackedView(true)
        } catch (err) {
          console.error("Error tracking video view:", err)
        }
      }

      if (isPlaying && !hasTrackedView) {
        trackVideoView()
      }
    }, [user, videoId, isPlaying, hasTrackedView, title, description, videoUrl, thumbnail, downloadUrl, tags])

    // Toggle favorite status
    const toggleFavorite = async () => {
      if (!user || !videoId) {
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
            await deleteDoc(document.ref)
          })

          toast({
            title: "Removed from favorites",
            description: "Video removed from your favorites",
          })
        } else {
          // Add to favorites
          await addDoc(collection(db, `users/${user.uid}/favorites`), {
            videoId: videoId,
            video: {
              uri: `/videos/${videoId}`,
              name: title,
              description: description || "",
              link: videoUrl,
              pictures: {
                sizes: [
                  {
                    width: 1280,
                    height: 720,
                    link: thumbnail || "",
                  },
                ],
              },
              tags: tags.map((tag) => ({ name: tag })),
              download: downloadUrl ? [{ link: downloadUrl }] : [],
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

    // Handle download
    const handleDownload = async () => {
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

        // Check if download URL exists
        if (!downloadUrl) {
          toast({
            title: "Download Error",
            description: "No download link available for this video.",
            variant: "destructive",
          })
          return
        }

        // Check download limits for non-pro users
        if (!isProUser && hasReachedLimit) {
          toast({
            title: "Download Limit Reached",
            description: "You've reached your monthly download limit. Upgrade for unlimited downloads.",
            variant: "destructive",
          })
          return
        }

        // Create a temporary anchor element for download
        const a = document.createElement("a")
        a.href = downloadUrl
        a.download = `${title.replace(/[^\w\s]/gi, "") || "video"}.mp4`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        // Show success toast
        toast({
          title: "Download Started",
          description: "Your video is downloading",
        })

        // Force refresh download limits
        forceRefresh()
      } catch (error) {
        console.error("Download failed:", error)
        toast({
          title: "Download Error",
          description: "There was an issue starting your download. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsDownloading(false)
      }
    }

    // Handle play/pause
    const togglePlay = () => {
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause()
        } else {
          videoRef.current.play()
        }
        setIsPlaying(!isPlaying)
      }
    }

    // Handle mute/unmute
    const toggleMute = () => {
      if (videoRef.current) {
        videoRef.current.muted = !isMuted
        setIsMuted(!isMuted)
      }
    }

    // Handle fullscreen
    const toggleFullscreen = () => {
      if (!playerRef.current) return

      if (!document.fullscreenElement) {
        playerRef.current.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`)
        })
      } else {
        document.exitFullscreen()
      }
    }

    // Update fullscreen state
    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement)
      }

      document.addEventListener("fullscreenchange", handleFullscreenChange)
      return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange)
      }
    }, [])

    // Handle time update
    const handleTimeUpdate = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime)
      }
    }

    // Handle seeking
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (videoRef.current) {
        const newTime = Number.parseFloat(e.target.value)
        videoRef.current.currentTime = newTime
        setCurrentTime(newTime)
      }
    }

    // Handle metadata loaded
    const handleLoadedMetadata = () => {
      if (videoRef.current) {
        setDuration(videoRef.current.duration)
        setIsLoading(false)
      }
    }

    // Handle video ended
    const handleEnded = () => {
      setIsPlaying(false)
      if (videoRef.current) {
        videoRef.current.currentTime = 0
        setCurrentTime(0)
      }
    }

    return (
      <div
        ref={playerRef}
        className="relative w-full bg-black rounded-lg overflow-hidden"
        style={{ aspectRatio: "16/9" }}
      >
        {/* Video */}
        <video
          ref={videoRef2}
          src={src || videoUrl}
          poster={poster || thumbnail}
          className="w-full h-full object-contain"
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          playsInline
          {...props}
        />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
          </div>
        )}

        {/* Play/pause overlay */}
        {!isLoading && !isPlaying && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
            onClick={togglePlay}
          >
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-600/80 hover:bg-red-600 transition-colors">
              <Play className="w-8 h-8 text-white" fill="white" />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          {/* Progress bar */}
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs text-white">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ef4444 ${(currentTime / (duration || 1)) * 100}%, #4b5563 ${(currentTime / (duration || 1)) * 100}%)`,
              }}
            />
            <span className="text-xs text-white">{formatTime(duration)}</span>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="text-white hover:text-red-500 transition-colors">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button onClick={toggleMute} className="text-white hover:text-red-500 transition-colors">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleFavorite}
                className={`text-white hover:text-red-500 transition-colors ${isFavorite ? "text-red-500" : ""}`}
                disabled={isCheckingFavorite}
              >
                <Heart className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} />
              </button>
              <button
                onClick={handleDownload}
                className="text-white hover:text-red-500 transition-colors"
                disabled={isDownloading || !downloadUrl}
              >
                <Download className="w-5 h-5" />
              </button>
              <button onClick={toggleFullscreen} className="text-white hover:text-red-500 transition-colors">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Title overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <h3 className="text-white font-medium truncate">{title}</h3>
        </div>

        {/* Close button if provided */}
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
    )
  },
)

VideoPlayer.displayName = "VideoPlayer"

export default VideoPlayer
