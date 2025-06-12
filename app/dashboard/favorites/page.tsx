"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { RefreshCw, Heart, Download, Lock, Play, Pause } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { useRouter } from "next/navigation"
import { trackFirestoreWrite } from "@/lib/firestore-optimizer"
import { TrackingService } from "@/lib/tracking-service"

// Local VimeoCard component to avoid circular dependencies
function LocalVimeoCard({ video }: { video: any }) {
  const [isActive, setIsActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [isIframeLoaded, setIsIframeLoaded] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadLink, setDownloadLink] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(true) // Always true since it's in favorites
  const [isCheckingFavorite, setIsCheckingFavorite] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()
  const videoRef = useRef<HTMLIFrameElement>(null)
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null)

  const videoId = video?.uri ? video.uri.split("/").pop() : null

  // Get the highest quality thumbnail
  const getHighQualityThumbnail = () => {
    if (!video?.pictures?.sizes || video.pictures.sizes.length === 0) {
      return ""
    }
    const sortedSizes = [...video.pictures.sizes].sort((a, b) => b.width - a.width)
    return sortedSizes[0].link
  }

  // Get download link
  useEffect(() => {
    if (video?.download && video.download.length > 0) {
      const sortedDownloads = [...video.download].sort((a, b) => b.size - a.size)
      setDownloadLink(sortedDownloads[0].link)
    } else {
      setDownloadLink(null)
    }
  }, [video])

  // Create download link element
  useEffect(() => {
    const downloadLinkElement = document.createElement("a")
    downloadLinkElement.style.display = "none"
    document.body.appendChild(downloadLinkElement)
    downloadLinkRef.current = downloadLinkElement

    return () => {
      if (downloadLinkElement.parentNode) {
        downloadLinkElement.parentNode.removeChild(downloadLinkElement)
      }
    }
  }, [])

  // Track video view
  useEffect(() => {
    const trackVideoView = async () => {
      if (!user || !isActive || hasTrackedView || !videoId || !video) return

      try {
        await addDoc(collection(db, `users/${user.uid}/history`), {
          videoId: videoId,
          video: video,
          viewedAt: serverTimestamp(),
        })
        trackFirestoreWrite("LocalVimeoCard-trackView", 1)
        setHasTrackedView(true)
      } catch (err) {
        console.error("Error tracking video view:", err)
      }
    }

    trackVideoView()
  }, [user, videoId, video, isActive, hasTrackedView])

  // Toggle favorite (remove from favorites)
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // if (onRemove) {
    //   onRemove()
    // }
  }

  // Record download
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

      if (!downloadLink) {
        setDownloadError(true)
        toast({
          title: "Download Error",
          description: "No download links available for this video.",
          variant: "destructive",
        })
        return
      }

      if (hasReachedLimit && !isProUser) {
        toast({
          title: "Download Limit Reached",
          description:
            "You've reached your monthly download limit of 25. Upgrade to Creator Pro for unlimited downloads.",
          variant: "destructive",
        })
        return
      }

      const result = await recordDownload()
      if (!result.success && !isProUser) {
        toast({
          title: "Download Error",
          description: result.message || "Failed to record download.",
          variant: "destructive",
        })
        return
      }

      const filename = `${video?.name?.replace(/[^\w\s]/gi, "") || "video"}.mp4`

      try {
        const response = await fetch(downloadLink)
        if (!response.ok) throw new Error("Network response was not ok")

        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)

        if (downloadLinkRef.current) {
          downloadLinkRef.current.href = objectUrl
          downloadLinkRef.current.download = filename
          downloadLinkRef.current.click()

          setTimeout(() => {
            URL.revokeObjectURL(objectUrl)
          }, 100)
        }

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
      }
    } finally {
      setIsDownloading(false)
    }
  }

  const handleIframeLoad = () => {
    setIsIframeLoaded(true)
  }

  const thumbnailUrl = getHighQualityThumbnail()

  const getVideoSrc = () => {
    return `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479&quality=1080p`
  }

  return (
    <div className="flex-shrink-0 w-full">
      <div
        className="group relative premium-hover-effect border border-transparent hover:border-white/20 transition-all duration-300"
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
        {/* Action buttons container */}
        <div
          className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between transition-opacity duration-300"
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          <button
            className={`${
              hasReachedLimit && !isProUser ? "bg-zinc-800/90 cursor-not-allowed" : "bg-black/70 hover:bg-black/90"
            } p-1.5 rounded-full transition-all duration-300`}
            onClick={handleDownload}
            aria-label={hasReachedLimit && !isProUser ? "Download limit reached" : "Download video"}
            disabled={isDownloading || (hasReachedLimit && !isProUser)}
            title={hasReachedLimit && !isProUser ? "Upgrade to Creator Pro for unlimited downloads" : "Download video"}
          >
            {hasReachedLimit && !isProUser ? (
              <Lock className="h-3.5 w-3.5 text-zinc-400" />
            ) : (
              <Download className={`h-3.5 w-3.5 ${downloadError ? "text-red-500" : "text-white"}`} />
            )}
          </button>

          <button
            className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300 text-crimson"
            onClick={toggleFavorite}
            aria-label="Remove from favorites"
            disabled={isCheckingFavorite}
            title="Remove from favorites"
          >
            <Heart className="h-3.5 w-3.5" fill="currentColor" />
          </button>
        </div>

        {videoId ? (
          <div className="absolute inset-0 video-container">
            {thumbnailUrl && (
              <div
                className={`absolute inset-0 video-card-thumbnail transition-all duration-300 ${
                  isActive && isIframeLoaded ? "opacity-0" : "opacity-100"
                }`}
                style={{
                  backgroundImage: `url(${thumbnailUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundColor: "#111",
                }}
              >
                <div
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    isHovered ? "opacity-30" : "opacity-50"
                  }`}
                  style={{
                    background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7))",
                  }}
                ></div>
              </div>
            )}

            {isActive && (
              <iframe
                ref={videoRef}
                src={getVideoSrc()}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                  opacity: isIframeLoaded ? 1 : 0,
                  transition: "opacity 300ms ease-in-out",
                }}
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                title={video.name || "Video"}
                loading="lazy"
                onLoad={handleIframeLoad}
              ></iframe>
            )}
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#111",
            }}
          >
            <span className="text-xs text-zinc-500">Video unavailable</span>
          </div>
        )}
      </div>
      <div
        className="mt-2 text-xs text-zinc-300 min-h-[2.5rem] line-clamp-2 font-light"
        title={video.name || "Untitled video"}
      >
        {video.name || "Untitled video"}
      </div>
    </div>
  )
}

// Local CreatorUploadCard component to avoid circular dependencies
function LocalCreatorUploadCard({ video }: { video: any }) {
  const [downloadError, setDownloadError] = useState(false)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()
  const router = useRouter()

  // Track video view
  const trackVideoView = async () => {
    if (!user || hasTrackedView || !video.id) return

    try {
      await addDoc(collection(db, `users/${user.uid}/history`), {
        videoId: video.id,
        video: video,
        viewedAt: serverTimestamp(),
      })
      trackFirestoreWrite("LocalCreatorUploadCard-trackView", 1)
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

  // Toggle favorite (remove from favorites)
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // if (onRemove) {
    //   onRemove()
    // }
  }

  // Record download
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

      if (hasReachedLimit && !isProUser) {
        toast({
          title: "Download Limit Reached",
          description:
            "You've reached your monthly download limit of 25. Upgrade to Creator Pro for unlimited downloads.",
          variant: "destructive",
        })
        return
      }

      const result = await recordDownload()
      if (!result.success && !isProUser) {
        toast({
          title: "Download Error",
          description: result.message || "Failed to record download.",
          variant: "destructive",
        })
        return
      }

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

        window.URL.revokeObjectURL(url)

        toast({
          title: "Download Started",
          description: "Your video is downloading",
        })

        try {
          await TrackingService.trackDownload(video.id, video.uid || "", user.uid)
        } catch (trackingError) {
          console.error("Error tracking download:", trackingError)
        }
      } catch (fetchError) {
        console.error("Fetch download failed, falling back to direct link:", fetchError)

        const filename = `${video.title?.replace(/[^\w\s]/gi, "") || "video"}.mp4`
        const downloadLink = document.createElement("a")
        downloadLink.href = video.fileUrl
        downloadLink.download = filename
        downloadLink.target = "_self"
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
    <div className="flex-shrink-0 w-full">
      <div
        className="relative group border border-transparent hover:border-white/20 transition-all duration-300 rounded-lg"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={trackVideoView}
      >
        <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 shadow-md">
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

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:bg-black/70"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
          </div>

          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

          <div className="absolute bottom-2 left-2 right-2 z-30 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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

            <button
              className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300 text-crimson"
              onClick={toggleFavorite}
              aria-label="Remove from favorites"
              title="Remove from favorites"
            >
              <Heart className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-zinc-300 min-h-[2.5rem] line-clamp-2 font-light" title={video.title}>
        {video.title || "Untitled video"}
      </div>
    </div>
  )
}

export default function FavoritesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const PAGE_SIZE = 12

  // Load favorites from Firestore
  const loadFavorites = async (isRefresh = false) => {
    if (!user) return

    try {
      if (isRefresh) {
        setLoading(true)
        setFavorites([])
        setLastDoc(null)
        setHasMore(true)
      } else {
        setLoadingMore(true)
      }

      const favoritesRef = collection(db, `users/${user.uid}/favorites`)
      let q = query(favoritesRef, orderBy("createdAt", "desc"), limit(PAGE_SIZE))

      if (!isRefresh && lastDoc) {
        q = query(favoritesRef, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(PAGE_SIZE))
      }

      const querySnapshot = await getDocs(q)
      const newFavorites: any[] = []

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        const favoriteWithId = {
          ...data,
          favoriteId: docSnapshot.id,
        }
        newFavorites.push(favoriteWithId)
      })

      if (isRefresh) {
        setFavorites(newFavorites)
      } else {
        setFavorites((prev) => [...prev, ...newFavorites])
      }

      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null)
      setHasMore(querySnapshot.docs.length === PAGE_SIZE)
      setError(null)
    } catch (err) {
      console.error("Error loading favorites:", err)
      setError("Failed to load favorites")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Remove favorite
  const removeFavorite = async (favoriteId: string) => {
    if (!user) return

    try {
      await deleteDoc(doc(db, `users/${user.uid}/favorites`, favoriteId))
      setFavorites((prev) => prev.filter((fav) => fav.favoriteId !== favoriteId))
      toast({
        title: "Removed from favorites",
        description: "Video removed from your favorites",
      })
    } catch (err) {
      console.error("Error removing favorite:", err)
      toast({
        title: "Error",
        description: "Failed to remove favorite",
        variant: "destructive",
      })
    }
  }

  // Intersection observer for infinite scroll
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loadingMore) return
      if (observerRef.current) observerRef.current.disconnect()
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            loadFavorites(false)
          }
        },
        { rootMargin: "200px" },
      )
      if (node) observerRef.current.observe(node)
    },
    [loadingMore, hasMore],
  )

  // Load favorites on mount
  useEffect(() => {
    if (user) {
      loadFavorites(true)
    }
  }, [user])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  }

  if (loading) {
    return <FavoritesLoading />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Your Favorites</h1>
          <p className="text-zinc-400">Videos you've saved for quick access</p>
        </div>
        <Button
          variant="outline"
          onClick={() => loadFavorites(true)}
          disabled={loading}
          className="border-zinc-800 bg-black/50 text-white hover:bg-zinc-900 hover:text-red-500 transition-all duration-300 w-fit"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center">
          <p className="text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-4">{error}</p>
        </motion.div>
      )}

      {/* Empty state */}
      {favorites.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="py-16 text-center"
        >
          <div className="max-w-md mx-auto bg-zinc-900/50 backdrop-blur-sm p-8 rounded-xl border border-zinc-800">
            <Heart className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-white text-xl font-medium mb-3">You haven't added any favorites yet</p>
            <p className="text-zinc-400 mb-6">
              Browse videos and click the heart icon to add them to your favorites for quick access.
            </p>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300"
              onClick={() => (window.location.href = "/dashboard/explore")}
            >
              Browse Videos
            </Button>
          </div>
        </motion.div>
      )}

      {/* Favorites grid */}
      {favorites.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4"
        >
          {favorites.map((favorite, index) => {
            const isCreatorUpload = !!favorite.creatorUpload

            return (
              <motion.div
                key={favorite.favoriteId}
                variants={itemVariants}
                ref={index === favorites.length - 1 ? lastElementRef : undefined}
              >
                {isCreatorUpload ? (
                  <LocalCreatorUploadCard video={favorite.creatorUpload} />
                ) : (
                  <LocalVimeoCard video={favorite.video} />
                )}
              </motion.div>
            )
          })}

          {/* Loading more indicator */}
          {loadingMore && (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`loading-${index}`} className="aspect-[9/16] bg-zinc-800/50 rounded-lg animate-pulse" />
              ))}
            </>
          )}
        </motion.div>
      )}

      {/* End of content message */}
      {!hasMore && favorites.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-zinc-500 mt-12 pb-4"
        >
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-zinc-700 to-transparent mx-auto mb-4"></div>
          <p>You've reached the end of your favorites</p>
        </motion.div>
      )}
    </div>
  )
}

// Loading component
function FavoritesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-zinc-800/50 rounded-md animate-pulse"></div>
          <div className="h-5 w-64 bg-zinc-800/50 rounded-md mt-2 animate-pulse"></div>
        </div>
        <div className="h-10 w-24 bg-zinc-800/50 rounded-md animate-pulse"></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="aspect-[9/16] bg-zinc-800/50 rounded-lg animate-pulse" />
            <div className="h-4 bg-zinc-800/50 rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-zinc-800/50 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
