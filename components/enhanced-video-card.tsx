"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Heart, Download, Play, Pause, Volume2, VolumeX } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"

interface VideoCardProps {
  video: {
    id: string
    title: string
    thumbnail?: string
    fileUrl?: string
    downloadUrl?: string
    creatorName?: string
    uri?: string
    name?: string
    pictures?: {
      sizes?: Array<{ link: string }>
    }
    download?: Array<{ link: string }>
  }
  type: "vimeo" | "creator-upload"
  showFavoriteButton?: boolean
  onFavoriteChange?: (isFavorited: boolean) => void
}

export default function EnhancedVideoCard({
  video,
  type,
  showFavoriteButton = true,
  onFavoriteChange,
}: VideoCardProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Get video data based on type
  const videoData = {
    id: video.id || video.uri?.split("/").pop() || "",
    title: video.title || video.name || "Untitled Video",
    thumbnail: video.thumbnail || video.pictures?.sizes?.[0]?.link || "/placeholder.svg?height=1920&width=1080",
    playbackUrl: type === "creator-upload" ? video.fileUrl : video.downloadUrl || video.download?.[0]?.link,
    downloadUrl: video.downloadUrl || video.fileUrl || video.download?.[0]?.link,
    creator: video.creatorName || "Unknown Creator",
  }

  // Check if video is favorited
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user || !videoData.id) return

      try {
        const favoriteDoc = await getDoc(doc(db, `users/${user.uid}/favorites`, videoData.id))
        setIsFavorited(favoriteDoc.exists())
      } catch (error) {
        console.error("Error checking favorite status:", error)
      }
    }

    checkFavoriteStatus()
  }, [user, videoData.id])

  // Handle video play/pause
  const togglePlayback = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  // Handle mute/unmute
  const toggleMute = () => {
    if (!videoRef.current) return

    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  // Handle mouse enter
  const handleMouseEnter = () => {
    setIsHovered(true)
    if (videoRef.current && videoData.playbackUrl) {
      videoRef.current.currentTime = 0
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsHovered(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  // Handle favorite toggle
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add favorites",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const favoriteRef = doc(db, `users/${user.uid}/favorites`, videoData.id)

      if (isFavorited) {
        await deleteDoc(favoriteRef)
        setIsFavorited(false)
        onFavoriteChange?.(false)
        toast({
          title: "Removed from favorites",
          description: "Video removed from your favorites",
        })
      } else {
        const favoriteData =
          type === "creator-upload"
            ? {
                videoId: videoData.id,
                creatorUpload: {
                  id: videoData.id,
                  title: videoData.title,
                  fileUrl: video.fileUrl,
                  thumbnailUrl: videoData.thumbnail,
                  creatorName: videoData.creator,
                },
                createdAt: new Date(),
              }
            : {
                videoId: videoData.id,
                video: video,
                createdAt: new Date(),
              }

        await setDoc(favoriteRef, favoriteData)
        setIsFavorited(true)
        onFavoriteChange?.(true)
        toast({
          title: "Added to favorites",
          description: "Video added to your favorites",
        })
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle download
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!videoData.downloadUrl) {
      toast({
        title: "Download Error",
        description: "No download link available for this video.",
        variant: "destructive",
      })
      return
    }

    try {
      const filename = `${videoData.title.replace(/[^\w\s]/gi, "") || "video"}.mp4`

      if (type === "creator-upload") {
        // For creator uploads, fetch as blob for direct download
        const response = await fetch(videoData.downloadUrl)
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)

        const downloadLink = document.createElement("a")
        downloadLink.href = blobUrl
        downloadLink.download = filename
        downloadLink.style.display = "none"
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)

        URL.revokeObjectURL(blobUrl)
      } else {
        // For Vimeo videos, direct link
        const downloadLink = document.createElement("a")
        downloadLink.href = videoData.downloadUrl
        downloadLink.download = filename
        downloadLink.target = "_self"
        downloadLink.style.display = "none"
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
      }

      toast({
        title: "Download Started",
        description: "Your video is downloading",
      })
    } catch (error) {
      console.error("Download failed:", error)
      toast({
        title: "Download Error",
        description: "There was an issue starting your download.",
        variant: "destructive",
      })
    }
  }

  return (
    <motion.div
      className="relative group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 shadow-lg ring-0 ring-white/20 transition-all duration-300 group-hover:ring-1 group-hover:shadow-xl">
        {/* Video/Thumbnail */}
        {videoData.playbackUrl && isHovered ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted={isMuted}
            loop
            playsInline
            preload="metadata"
            onError={() => {
              console.error("Video playback error")
            }}
          >
            <source src={videoData.playbackUrl} type="video/mp4" />
          </video>
        ) : (
          <img
            src={videoData.thumbnail || "/placeholder.svg"}
            alt={videoData.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = "/placeholder.svg?height=1920&width=1080"
            }}
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top controls */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20">
          {/* Type indicator */}
          <span
            className={`px-2 py-1 text-xs rounded-full font-medium backdrop-blur-sm ${
              type === "creator-upload" ? "bg-blue-600/80 text-white" : "bg-purple-600/80 text-white"
            }`}
          >
            {type === "creator-upload" ? "Upload" : "Vimeo"}
          </span>

          {/* Favorite button */}
          {showFavoriteButton && (
            <Button
              size="icon"
              variant="ghost"
              className={`h-8 w-8 backdrop-blur-sm transition-all duration-200 ${
                isFavorited
                  ? "bg-red-600/80 text-white hover:bg-red-700/80"
                  : "bg-black/40 text-white hover:bg-black/60"
              }`}
              onClick={toggleFavorite}
              disabled={isLoading}
            >
              <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
            </Button>
          )}
        </div>

        {/* Center play button (when not hovered) */}
        {!isHovered && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/50 backdrop-blur-sm rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Play className="h-6 w-6 text-white" />
            </div>
          </div>
        )}

        {/* Video controls (when hovered and playing) */}
        {isHovered && videoData.playbackUrl && (
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-20">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation()
                togglePlayback()
              }}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleMute()
                }}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Download button (when not hovered) */}
        {!isHovered && (
          <div className="absolute bottom-3 right-3 z-20">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Video info */}
      <div className="mt-3 space-y-1">
        <h3 className="text-sm text-white font-medium line-clamp-2 leading-tight" title={videoData.title}>
          {videoData.title}
        </h3>
        <p className="text-xs text-zinc-400 line-clamp-1">{videoData.creator}</p>
      </div>
    </motion.div>
  )
}
