"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Heart, Download } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

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

  // Handle mouse enter
  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsHovered(false)
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
    <div className="relative cursor-pointer" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900">
        {/* Video/Thumbnail */}
        <img
          src={videoData.thumbnail || "/placeholder.svg?height=480&width=270&text=Video"}
          alt={videoData.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/placeholder.svg?height=480&width=270&text=Video"
          }}
        />

        {/* Action buttons container - only show on hover */}
        {isHovered && (
          <>
            {/* Download button */}
            <div className="absolute bottom-2 right-2 z-20">
              <button
                className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300"
                onClick={handleDownload}
                aria-label="Download video"
                title="Download video"
              >
                <Download className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            {/* Favorite button */}
            {showFavoriteButton && (
              <div className="absolute bottom-2 left-2 z-20">
                <button
                  className={`bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300 ${
                    isFavorited ? "text-red-500" : "text-white"
                  }`}
                  onClick={toggleFavorite}
                  aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                  title={isFavorited ? "Remove from favorites" : "Add to favorites"}
                  disabled={isLoading}
                >
                  <Heart className="h-3.5 w-3.5" fill={isFavorited ? "currentColor" : "none"} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
