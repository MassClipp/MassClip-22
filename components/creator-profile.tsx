"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import {
  Share2,
  Plus,
  Instagram,
  Twitter,
  Globe,
  Calendar,
  Film,
  Play,
  Pause,
  RefreshCw,
  Loader2,
  Download,
  Lock,
  Heart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import PremiumContentSection from "@/components/premium-content-section"
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  increment,
  deleteDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import AudioCard from "@/components/audio-card"
import { useToast } from "@/hooks/use-toast"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { trackFirestoreWrite } from "@/lib/firestore-optimizer"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  createdAt: string
  isPro?: boolean
  socialLinks?: {
    instagram?: string
    twitter?: string
    website?: string
  }
}

interface FreeContentItem {
  id: string
  title: string
  fileUrl: string
  type: string
  uid: string
  uploadId: string
  addedAt: any
  thumbnailUrl?: string
}

export default function CreatorProfile({ creator: initialCreator }: { creator: Creator }) {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const [creator, setCreator] = useState<Creator>(initialCreator)
  const [refreshing, setRefreshing] = useState(false)
  const isOwner = user && user.uid === creator.uid
  const router = useRouter()

  const [freeClips, setFreeClips] = useState<FreeContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Set active tab based on URL query parameter
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "premium") {
      setActiveTab("premium")
    } else {
      setActiveTab("free")
    }
  }, [searchParams])

  // Function to refresh creator data
  const refreshCreatorData = async () => {
    if (!creator.uid) return

    try {
      setRefreshing(true)
      console.log("Refreshing creator data for:", creator.uid)

      // First try to get from creators collection
      const creatorDoc = await getDoc(doc(db, "creators", creator.username.toLowerCase()))

      if (creatorDoc.exists()) {
        const creatorData = creatorDoc.data()
        console.log("Updated creator data from creators collection:", creatorData)

        // Only use profilePic field, ignore photoURL
        const profilePicUrl = creatorData.profilePic
        const cacheBustedProfilePic = profilePicUrl
          ? profilePicUrl.includes("?")
            ? `${profilePicUrl}&cb=${Date.now()}`
            : `${profilePicUrl}?cb=${Date.now()}`
          : null

        setCreator((prev) => ({
          ...prev,
          displayName: creatorData.displayName || prev.displayName,
          bio: creatorData.bio || prev.bio,
          profilePic: cacheBustedProfilePic || prev.profilePic,
          socialLinks: creatorData.socialLinks || prev.socialLinks,
        }))

        // If photoURL exists, remove it to avoid confusion
        if (creatorData.photoURL) {
          try {
            await updateDoc(doc(db, "creators", creator.username.toLowerCase()), {
              photoURL: null, // Remove the photoURL field
            })
            console.log("✅ Removed photoURL field from creator document")
          } catch (error) {
            console.warn("Could not remove photoURL field from creator:", error)
          }
        }
      } else {
        // Fallback to users collection
        const userDoc = await getDoc(doc(db, "users", creator.uid))

        if (userDoc.exists()) {
          const userData = userDoc.data()
          console.log("Updated creator data from users collection:", userData)

          // Only use profilePic field, ignore photoURL
          const profilePicUrl = userData.profilePic
          const cacheBustedProfilePic = profilePicUrl
            ? profilePicUrl.includes("?")
              ? `${profilePicUrl}&cb=${Date.now()}`
              : `${profilePicUrl}?cb=${Date.now()}`
            : null

          setCreator((prev) => ({
            ...prev,
            displayName: userData.displayName || prev.displayName,
            bio: userData.bio || prev.bio,
            profilePic: cacheBustedProfilePic || prev.profilePic,
            socialLinks: userData.socialLinks || prev.socialLinks,
          }))

          // If photoURL exists, remove it to avoid confusion
          if (userData.photoURL) {
            try {
              await updateDoc(doc(db, "users", creator.uid), {
                photoURL: null, // Remove the photoURL field
              })
              console.log("✅ Removed photoURL field from user document")
            } catch (error) {
              console.warn("Could not remove photoURL field from user:", error)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing creator data:", error)
    } finally {
      setRefreshing(false)
    }
  }

  // Auto-refresh creator data if user is the owner and comes from profile edit
  useEffect(() => {
    if (isOwner && searchParams.get("updated") === "true") {
      refreshCreatorData()
      // Remove the updated parameter from URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("updated")
      window.history.replaceState({}, "", newUrl.toString())
    }
  }, [isOwner, searchParams])

  // Fetch free content for all visitors
  useEffect(() => {
    const fetchFreeContent = async () => {
      if (!creator || !creator.uid) {
        console.error("Creator data is missing or invalid:", creator)
        setError("Creator data is missing")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log("Fetching free content for creator:", creator.uid)

        // Use the public API endpoint to fetch free content for this creator
        const response = await fetch(`/api/creator/${creator.uid}/free-content`)

        if (!response.ok) {
          throw new Error(`Failed to fetch free content: ${response.status}`)
        }

        const data = await response.json()
        console.log(`API response: ${data.freeContent?.length || 0} free content items found`)

        setFreeClips(data.freeContent || [])
        setError(null)
      } catch (error) {
        console.error("Error fetching free content:", error)
        setError("Failed to load content. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchFreeContent()
  }, [creator])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${creator.displayName} on MassClip`,
          text: `Check out ${creator.displayName}'s content on MassClip`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
      alert("Profile link copied to clipboard!")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const handleAddClip = (isPremium = false) => {
    if (isPremium) {
      router.push("/dashboard/upload?premium=true")
    } else {
      router.push("/dashboard/free-content")
    }
  }

  // Video card component with inline playback and download/favorite functionality
  const VideoCard = ({ item }: { item: FreeContentItem }) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadError, setDownloadError] = useState(false)
    const [isFavorite, setIsFavorite] = useState(false)
    const [isCheckingFavorite, setIsCheckingFavorite] = useState(true)
    const [hasTrackedView, setHasTrackedView] = useState(false)

    const { toast } = useToast()
    const { planData } = useUserPlan()
    const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()

    // Check if video is in favorites
    useEffect(() => {
      const checkIfFavorite = async () => {
        if (!user || !item.id) {
          setIsCheckingFavorite(false)
          return
        }

        try {
          const favoritesRef = collection(db, `users/${user.uid}/favorites`)
          const q = query(favoritesRef, where("videoId", "==", item.id))
          const querySnapshot = await getDocs(q)

          setIsFavorite(!querySnapshot.empty)
        } catch (err) {
          console.error("Error checking favorite status:", err)
        } finally {
          setIsCheckingFavorite(false)
        }
      }

      checkIfFavorite()
    }, [user, item.id])

    // Track video view
    const trackVideoView = async () => {
      if (!user || hasTrackedView || !item.id) return

      try {
        await addDoc(collection(db, `users/${user.uid}/history`), {
          videoId: item.id,
          video: item,
          viewedAt: serverTimestamp(),
        })

        trackFirestoreWrite("CreatorProfile-VideoCard-trackView", 1)
        setHasTrackedView(true)
      } catch (err) {
        console.error("Error tracking video view:", err)
      }
    }

    // Toggle favorite status
    const toggleFavorite = async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!user || !item.id) {
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
          const q = query(favoritesRef, where("videoId", "==", item.id))
          const querySnapshot = await getDocs(q)

          querySnapshot.forEach(async (document) => {
            await deleteDoc(doc(db, `users/${user.uid}/favorites`, document.id))
          })

          toast({
            title: "Removed from favorites",
            description: "Video removed from your favorites",
          })
        } else {
          // Create a sanitized version of the video object
          const safeVideo = {
            id: item.id || "",
            title: item.title || "Untitled",
            fileUrl: item.fileUrl || "",
            thumbnailUrl: item.thumbnailUrl || "",
            creatorName: creator.displayName || "Unknown Creator",
            uid: item.uid || "",
            views: 0,
            downloads: 0,
          }

          await addDoc(collection(db, `users/${user.uid}/favorites`), {
            videoId: item.id,
            creatorUpload: safeVideo,
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

        if (!item.fileUrl) {
          setDownloadError(true)
          toast({
            title: "Download Error",
            description: "No download link available for this video.",
            variant: "destructive",
          })
          return
        }

        if (!isProUser) {
          if (hasReachedLimit) {
            toast({
              title: "Download Limit Reached",
              description:
                "You've reached your monthly download limit. Upgrade to Creator Pro for unlimited downloads.",
              variant: "destructive",
            })
            return
          }

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

        // Direct download using fetch and blob
        try {
          const response = await fetch(item.fileUrl)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)

          const filename = `${item.title?.replace(/[^\w\s]/gi, "") || "video"}.mp4`
          const downloadLink = document.createElement("a")
          downloadLink.href = url
          downloadLink.download = filename
          downloadLink.style.display = "none"
          document.body.appendChild(downloadLink)
          downloadLink.click()
          document.body.removeChild(downloadLink)

          // Clean up the blob URL
          window.URL.revokeObjectURL(url)

          if (isProUser) {
            recordDownload().catch((error) => {
              console.error("Error recording pro user download:", error)
            })
          }

          toast({
            title: "Download Started",
            description: "Your video is downloading",
          })
        } catch (fetchError) {
          console.error("Fetch download failed, falling back to direct link:", fetchError)

          // Fallback to direct link method if fetch fails
          const filename = `${item.title?.replace(/[^\w\s]/gi, "") || "video"}.mp4`
          const downloadLink = document.createElement("a")
          downloadLink.href = item.fileUrl
          downloadLink.download = filename
          downloadLink.target = "_self"
          downloadLink.style.display = "none"
          document.body.appendChild(downloadLink)
          downloadLink.click()
          document.body.removeChild(downloadLink)

          if (isProUser) {
            recordDownload().catch((error) => {
              console.error("Error recording pro user download:", error)
            })
          }

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

    const togglePlay = (e: React.MouseEvent) => {
      e.preventDefault()

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

    // Use AudioCard for audio files
    if (item.type === "audio") {
      return (
        <AudioCard
          audio={{
            id: item.id,
            title: item.title,
            fileUrl: item.fileUrl,
            creatorName: creator.displayName,
            thumbnailUrl: item.thumbnailUrl,
          }}
          className="w-full"
        />
      )
    }

    // Only render video card for video types
    if (item.type !== "video") {
      return (
        <div className="group relative transition-all duration-300">
          <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 shadow-md ring-0 ring-white/30 transition-all duration-300 group-hover:ring-1">
            {item.type === "image" ? (
              <img src={item.fileUrl || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <span className="text-zinc-400 text-sm">{item.type.toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="mt-2">
            <h3 className="text-sm text-white font-light line-clamp-2">{item.title}</h3>
          </div>
        </div>
      )
    }

    return (
      <div
        className="group relative transition-all duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={trackVideoView}
      >
        {/* Video container with 9:16 aspect ratio */}
        <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 shadow-md border border-transparent hover:border-white/20 transition-all duration-300">
          {/* Raw video element */}
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
            <source src={item.fileUrl} type="video/mp4" />
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
            {/* Download button */}
            <button
              className={`${
                hasReachedLimit ? "bg-zinc-800/90 cursor-not-allowed" : "bg-black/70 hover:bg-black/90"
              } p-1.5 rounded-full transition-all duration-300 ${downloadError ? "ring-1 ring-red-500" : ""}`}
              onClick={handleDownload}
              aria-label={hasReachedLimit ? "Download limit reached" : "Download video"}
              disabled={isDownloading || hasReachedLimit}
              title={hasReachedLimit ? "Upgrade to Creator Pro for unlimited downloads" : "Download video"}
            >
              {hasReachedLimit ? (
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

        {/* Video title */}
        <div className="mt-2">
          <h3 className="text-sm text-white font-light line-clamp-2">{item.title}</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section with Gradient Background */}
      <div className="relative">
        {/* Background gradient with subtle pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>

        <div className="container mx-auto relative z-10">
          {/* Profile Header */}
          <div className="pt-10 pb-8 px-4 md:px-8 lg:px-0">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Profile Image with Gradient Border */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-red-500 to-amber-500 rounded-full opacity-75 blur-sm group-hover:opacity-100 transition duration-300"></div>
                <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800">
                  {creator.profilePic ? (
                    <Image
                      src={creator.profilePic || "/placeholder.svg"}
                      alt={creator.displayName}
                      width={144}
                      height={144}
                      className="object-cover w-full h-full"
                      key={creator.profilePic} // Force re-render when URL changes
                      onError={(e) => {
                        console.error("Failed to load creator profile image:", e)
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-400 text-4xl font-light">
                      {creator.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Premium indicator - only show if user is Pro */}
                {creator.isPro && (
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-600 text-black text-xs font-bold px-2.5 py-0.5 rounded-full shadow-lg">
                    PRO
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-semibold text-white mb-1 tracking-tight">
                  {creator.displayName}
                </h1>
                <p className="text-zinc-400 text-sm mb-4">@{creator.username}</p>

                {creator.bio && (
                  <div className="relative max-w-2xl mb-6">
                    <p className="text-zinc-300 text-sm">{creator.bio}</p>
                  </div>
                )}

                {/* Stats Cards Row */}
                <div className="grid grid-cols-2 gap-3 max-w-md mb-6">
                  <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center">
                    <Calendar className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                    <p className="text-xs text-zinc-400">Member since</p>
                    <p className="text-sm font-medium text-white">{formatDate(creator.createdAt)}</p>
                  </div>
                  <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center">
                    <Film className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                    <p className="text-xs text-zinc-400">Free content</p>
                    <p className="text-sm font-medium text-white">{freeClips.length}</p>
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
                  {creator.socialLinks?.instagram && (
                    <a
                      href={`https://instagram.com/${creator.socialLinks.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs bg-zinc-900/80 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors border border-zinc-800/50"
                    >
                      <Instagram className="h-3.5 w-3.5" />
                      <span>Instagram</span>
                    </a>
                  )}

                  {creator.socialLinks?.twitter && (
                    <a
                      href={`https://twitter.com/${creator.socialLinks.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs bg-zinc-900/80 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors border border-zinc-800/50"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      <span>Twitter</span>
                    </a>
                  )}

                  {creator.socialLinks?.website && (
                    <a
                      href={creator.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs bg-zinc-900/80 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors border border-zinc-800/50"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>Website</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 md:mt-0">
                {isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 hover:bg-zinc-800 text-white"
                    onClick={refreshCreatorData}
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 hover:bg-zinc-800 text-white"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs with Gradient Highlight */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 pb-20">
        {/* Tab Navigation */}
        <div className="border-b border-zinc-800/50 mb-8">
          <div className="flex">
            <button
              className={cn(
                "px-6 py-3 text-sm font-medium relative transition-all duration-200",
                activeTab === "free" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
              onClick={() => setActiveTab("free")}
            >
              Free Content
              {activeTab === "free" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-600"></div>
              )}
            </button>

            <button
              className={cn(
                "px-6 py-3 text-sm font-medium relative transition-all duration-200",
                activeTab === "premium" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
              onClick={() => setActiveTab("premium")}
            >
              Premium Content
              {activeTab === "premium" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-600"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="mt-8">
          {/* Error message */}
          {error && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-200 p-4 rounded-lg mb-8">
              <p>{error}</p>
            </div>
          )}

          {activeTab === "free" && (
            <div>
              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
                </div>
              ) : freeClips.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {freeClips.map((item) => (
                    <VideoCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="max-w-md mx-auto bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                      <Film className="h-8 w-8 text-zinc-600" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">No Free Content Yet</h3>
                    <p className="text-zinc-400 mb-6">
                      {isOwner
                        ? "Share your first free content to attract viewers and showcase your work."
                        : `${creator.displayName} hasn't shared any free content yet.`}
                    </p>

                    {isOwner && (
                      <Button
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
                        onClick={() => handleAddClip(false)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Content
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "premium" && (
            <PremiumContentSection creatorId={creator.uid} creatorUsername={creator.username} isOwner={isOwner} />
          )}
        </div>
      </div>
    </div>
  )
}
