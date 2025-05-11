"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Download, Heart } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
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
} from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import ClipPlayer from "@/components/ClipPlayer"
import type { Clip } from "@/hooks/use-clips"

interface VimeoCardProps {
  video: Clip
}

export default function VimeoCard({ video }: VimeoCardProps) {
  const [isActive, setIsActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null)

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
      if (!video.url) {
        setDownloadError(true)
        toast({
          title: "Download Error",
          description: "No download link available for this video.",
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
            description: "You've reached your monthly download limit. Upgrade to Creator Pro for unlimited downloads.",
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
      const filename = `${video?.title?.replace(/[^\w\s]/gi, "") || "video"}.mp4`

      // Create a temporary anchor element
      const a = document.createElement("a")
      a.href = video.url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // If pro user, record the download after (doesn't affect permissions)
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
          {/* Download button */}
          <button
            className={`bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300 ${
              downloadError ? "ring-1 ring-red-500" : ""
            }`}
            onClick={handleDownload}
            aria-label="Download video"
            disabled={isDownloading}
            title="Download video"
          >
            <Download className={`h-3.5 w-3.5 ${downloadError ? "text-red-500" : "text-white"}`} />
          </button>

          {/* Favorite button */}
          <button
            className={`bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300 ${
              isFavorite ? "text-crimson" : "text-white"
            }`}
            onClick={toggleFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="absolute inset-0">
          {isActive ? (
            <ClipPlayer src={video.url} />
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${video.thumbnailUrl || "/placeholder.svg"})`,
                backgroundColor: "#111",
              }}
            >
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7))",
                  opacity: isHovered ? 0.3 : 0.5,
                }}
              ></div>
            </div>
          )}
        </div>
      </div>
      <div
        className="mt-2 text-xs text-zinc-300 min-h-[2.5rem] line-clamp-2 font-light"
        title={video.title || "Untitled video"}
      >
        {video.title || "Untitled video"}
      </div>
    </div>
  )
}
