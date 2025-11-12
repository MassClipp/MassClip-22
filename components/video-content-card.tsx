"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { doc, updateDoc, increment } from "firebase/firestore"
import { Play, Pause, Download, Lock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useDownloadLimit } from "@/contexts/download-limit-context"

interface ContentItem {
  id: string
  title: string
  thumbnailUrl: string
  fileUrl: string
  duration: string
  views: number
  type: "video" | "audio" | "image" | "bundle" | "ebook"
  isPremium: boolean
  price?: number
  contentCount?: number
  description?: string
  stripePriceId?: string
  stripeProductId?: string
  coverUrl?: string
  pageCount?: number
}

export function VideoContentCard({ item }: { item: ContentItem }) {
  const [user] = useAuthState(auth)
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast } = useToast()
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()

  const videoUrl = item.fileUrl

  const recordDownload = async () => {
    if (!user) return { success: true }
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

  const startDirectDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error("Network response was not ok")

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = objectUrl
      link.download = filename
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 100)

      return true
    } catch (error) {
      console.error("Direct download failed:", error)
      return false
    }
  }

  const handlePlayPause = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!videoRef.current || !videoUrl) {
      return
    }

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

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isDownloading) return
    setIsDownloading(true)

    try {
      if (!item.fileUrl) {
        toast({
          title: "Download Error",
          description: "No download links available for this video.",
          variant: "destructive",
        })
        return
      }

      if (user && !isProUser && hasReachedLimit) {
        toast({
          title: "Download Limit Reached",
          description:
            "You've reached your monthly download limit of 15. Upgrade to Creator Pro for unlimited downloads.",
          variant: "destructive",
        })
        return
      }

      if (user) {
        const result = await recordDownload()
        if (!result.success && !isProUser) {
          toast({
            title: "Download Error",
            description: result.message || "Failed to record download.",
            variant: "destructive",
          })
          return
        }
      }

      const filename = `${item.title?.replace(/[^\w\s]/gi, "") || "video"}.mp4`
      const success = await startDirectDownload(videoUrl, filename)

      if (!success) {
        const link = document.createElement("a")
        link.href = videoUrl
        link.download = filename
        link.target = "_blank"
        link.style.display = "none"

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      toast({
        title: "Download Started",
        description: "Your video is downloading",
      })
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

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    videoElement.addEventListener("play", handlePlay)
    videoElement.addEventListener("pause", handlePause)
    videoElement.addEventListener("ended", handleVideoEnd)

    return () => {
      videoElement.removeEventListener("play", handlePlay)
      videoElement.removeEventListener("pause", handlePause)
      videoElement.removeEventListener("ended", handleVideoEnd)
    }
  }, [])

  return (
    <div
      className="group cursor-pointer w-full max-w-[180px] sm:max-w-[200px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative aspect-[9/16] rounded-lg overflow-hidden mb-2 transition-all duration-300 ${
          isHovered ? "border border-white/50" : "border border-transparent"
        }`}
      >
        {videoUrl && (
          <video
            ref={videoRef}
            className="w-full h-full object-cover bg-black"
            preload="auto"
            muted
            playsInline
            controls={false}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}

        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
            isHovered || !isPlaying ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={handlePlayPause}
            disabled={!videoUrl}
            className="transition-transform duration-300 hover:scale-110 disabled:opacity-50"
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 text-white drop-shadow-lg" />
            ) : (
              <Play className="h-6 w-6 text-white drop-shadow-lg" />
            )}
          </button>
        </div>

        {videoUrl && (
          <button
            onClick={handleDownload}
            disabled={isDownloading || (user && hasReachedLimit && !isProUser)}
            className={`absolute bottom-2 right-2 backdrop-blur-sm p-1.5 rounded-full transition-all duration-200 hover:scale-110 ${
              user && hasReachedLimit && !isProUser
                ? "bg-zinc-800/90 cursor-not-allowed"
                : "bg-black/60 hover:bg-black/80"
            } ${isHovered ? "opacity-100" : "opacity-70"}`}
            aria-label={
              user && hasReachedLimit && !isProUser
                ? "Upgrade to Creator Pro for unlimited downloads"
                : "Download video"
            }
            title={
              user && hasReachedLimit && !isProUser
                ? "Upgrade to Creator Pro for unlimited downloads"
                : "Download video"
            }
          >
            {user && hasReachedLimit && !isProUser ? (
              <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-zinc-400" />
            ) : (
              <Download className={`h-3 w-3 sm:h-3.5 sm:w-3.5 text-white ${isDownloading ? "animate-pulse" : ""}`} />
            )}
          </button>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-white text-xs sm:text-sm font-medium line-clamp-2 leading-tight" title={item.title}>
          {item.title}
        </h3>
      </div>
    </div>
  )
}
