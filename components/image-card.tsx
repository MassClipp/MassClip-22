"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Download, Heart, Lock } from "lucide-react"
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
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { cn } from "@/lib/utils"

interface ImageCardProps {
  image: {
    id: string
    title: string
    fileUrl: string
    thumbnailUrl?: string
    creatorName?: string
    uid?: string
    size?: number
  }
  className?: string
}

export default function ImageCard({ image, className }: ImageCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isCheckingFavorite, setIsCheckingFavorite] = useState(true)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const { user } = useAuth()
  const { toast } = useToast()
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()

  useEffect(() => {
    console.log("[v0] ImageCard props:", {
      id: image.id,
      title: image.title,
      fileUrl: image.fileUrl,
      thumbnailUrl: image.thumbnailUrl,
      hasFileUrl: !!image.fileUrl,
      hasThumbnailUrl: !!image.thumbnailUrl,
    })

    const checkIfFavorite = async () => {
      if (!user || !image.id) {
        setIsCheckingFavorite(false)
        return
      }

      try {
        const favoritesRef = collection(db, `users/${user.uid}/favorites`)
        const q = query(favoritesRef, where("videoId", "==", image.id))
        const querySnapshot = await getDocs(q)

        setIsFavorite(!querySnapshot.empty)
      } catch (err) {
        console.error("Error checking favorite status:", err)
      } finally {
        setIsCheckingFavorite(false)
      }
    }

    checkIfFavorite()
  }, [user, image.id])

  const trackImageView = async () => {
    if (!user || hasTrackedView || !image.id) return

    try {
      await addDoc(collection(db, `users/${user.uid}/history`), {
        videoId: image.id,
        video: image,
        viewedAt: serverTimestamp(),
      })

      trackFirestoreWrite("ImageCard-trackView", 1)
      setHasTrackedView(true)
    } catch (err) {
      console.error("Error tracking image view:", err)
    }
  }

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

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user || !image.id) {
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
        const q = query(favoritesRef, where("videoId", "==", image.id))
        const querySnapshot = await getDocs(q)

        querySnapshot.forEach(async (document) => {
          await deleteDoc(doc(db, `users/${user.uid}/favorites`, document.id))
        })

        toast({
          title: "Removed from favorites",
          description: "Image removed from your favorites",
        })
      } else {
        await addDoc(collection(db, `users/${user.uid}/favorites`), {
          videoId: image.id,
          video: image,
          createdAt: serverTimestamp(),
        })

        toast({
          title: "Added to favorites",
          description: "Image saved to your favorites",
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

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isDownloading) return
    setIsDownloading(true)

    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to download images",
          variant: "destructive",
        })
        return
      }

      if (!image.fileUrl) {
        toast({
          title: "Download Error",
          description: "No download link available for this image.",
          variant: "destructive",
        })
        return
      }

      if (!isProUser && hasReachedLimit) {
        toast({
          title: "Download Limit Reached",
          description: "You've reached your monthly download limit. Upgrade to Creator Pro for unlimited downloads.",
          variant: "destructive",
        })
        return
      }

      if (!isProUser) {
        const result = await recordDownload()
        if (!result.success) {
          toast({
            title: "Download Error",
            description: result.message || "Failed to record download.",
            variant: "destructive",
          })
          return
        }
      }

      const filename = `${image.title?.replace(/[^\w\s]/gi, "") || "image"}.jpg`
      const downloadLink = document.createElement("a")
      downloadLink.href = image.fileUrl
      downloadLink.download = filename
      downloadLink.style.display = "none"
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      toast({
        title: "Download Started",
        description: "Your image is downloading",
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

  const handleImageClick = () => {
    trackImageView()
  }

  const getImageSrc = () => {
    if (imageError) {
      console.log("[v0] Using placeholder due to image error")
      return `/placeholder.svg?height=640&width=360&query=${encodeURIComponent(image.title || "Image")}`
    }
    const src = image.thumbnailUrl || image.fileUrl
    console.log("[v0] Using image source:", src)
    return src
  }

  return (
    <div
      className={cn("flex-shrink-0 w-[280px]", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleImageClick}
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 group cursor-pointer">
        <div className="absolute inset-0 border border-white/0 group-hover:border-white/40 rounded-lg transition-all duration-200 z-20"></div>

        {isLoading && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
            <div className="animate-pulse text-zinc-400 text-sm">Loading...</div>
          </div>
        )}

        <img
          src={getImageSrc() || "/placeholder.svg"}
          alt={image.title || "Image"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          crossOrigin="anonymous"
          onError={(e) => {
            console.error("[v0] Image failed to load:", {
              src: getImageSrc(),
              fileUrl: image.fileUrl,
              thumbnailUrl: image.thumbnailUrl,
              error: e,
              naturalWidth: (e.target as HTMLImageElement).naturalWidth,
              naturalHeight: (e.target as HTMLImageElement).naturalHeight,
            })
            setImageError(true)
            setIsLoading(false)
          }}
          onLoad={(e) => {
            const img = e.target as HTMLImageElement
            console.log("[v0] Image loaded successfully:", {
              src: getImageSrc(),
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              complete: img.complete,
            })
            setImageError(false)
            setIsLoading(false)
          }}
          style={{
            objectFit: "cover",
            objectPosition: "center",
          }}
        />

        <div
          className={cn(
            "absolute bottom-2 left-2 right-2 flex items-center justify-between transition-opacity duration-300 z-30",
            isHovered ? "opacity-100" : "opacity-0",
          )}
        >
          <button
            onClick={toggleFavorite}
            className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300"
            disabled={isCheckingFavorite}
          >
            <Heart className={cn("h-3.5 w-3.5", isFavorite ? "text-red-500 fill-current" : "text-white")} />
          </button>

          <button
            onClick={handleDownload}
            className={cn(
              "p-1.5 rounded-full transition-all duration-300",
              hasReachedLimit && !isProUser ? "bg-zinc-800/90 cursor-not-allowed" : "bg-black/70 hover:bg-black/90",
            )}
            disabled={isDownloading || (hasReachedLimit && !isProUser)}
            title={hasReachedLimit && !isProUser ? "Upgrade to Creator Pro for unlimited downloads" : "Download image"}
          >
            {hasReachedLimit && !isProUser ? (
              <Lock className="h-3.5 w-3.5 text-zinc-400" />
            ) : (
              <Download className={cn("h-3.5 w-3.5", isDownloading ? "text-zinc-400 animate-pulse" : "text-white")} />
            )}
          </button>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <h3 className="font-medium text-white text-sm line-clamp-2 leading-tight" title={image.title}>
          {image.title || "Untitled Image"}
        </h3>
        {image.creatorName && <p className="text-xs text-zinc-400 truncate">{image.creatorName}</p>}
      </div>
    </div>
  )
}
