"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import {
  Share2,
  Edit,
  Plus,
  Instagram,
  Twitter,
  Globe,
  Calendar,
  Film,
  Lock,
  Play,
  Pause,
  Trash2,
  CreditCard,
  Unlock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { trackFirestoreRead } from "@/lib/firestore-optimizer"
import getStripe from "@/lib/getStripe"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  createdAt: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    website?: string
  }
  premiumEnabled?: boolean
  premiumPrice?: number
  stripePriceId?: string
  paymentMode?: "one-time" | "subscription"
}

interface VideoItem {
  id: string
  title: string
  thumbnailUrl: string
  url: string
  type: string
  status: string
  isPublic: boolean
  uid: string
  username: string
  views: number
  likes: number
}

export default function CreatorProfile({ creator }: { creator: Creator }) {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const isOwner = user && user.uid === creator.uid
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [freeClips, setFreeClips] = useState<VideoItem[]>([])
  const [paidClips, setPaidClips] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [userPurchases, setUserPurchases] = useState<Record<string, boolean>>({})

  // Set active tab based on URL query parameter
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "premium") {
      setActiveTab("premium")
    } else {
      setActiveTab("free")
    }
  }, [searchParams])

  // Check if user has purchased premium content
  useEffect(() => {
    const checkPurchases = async () => {
      if (!user || !paidClips.length) return

      try {
        // For each premium clip, check if the user has access
        const purchases: Record<string, boolean> = {}

        for (const clip of paidClips) {
          // Check if user has access to this clip
          const accessRef = doc(db, "userAccess", user.uid, "videos", clip.id)
          const accessDoc = await getDoc(accessRef)
          purchases[clip.id] = accessDoc.exists()
        }

        setUserPurchases(purchases)
      } catch (error) {
        console.error("Error checking purchases:", error)
      }
    }

    checkPurchases()
  }, [user, paidClips])

  // Fetch videos from Firestore
  useEffect(() => {
    const fetchVideos = async () => {
      if (!creator || !creator.uid) {
        console.error("Creator data is missing or invalid:", creator)
        setError("Creator data is missing")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log("Fetching videos for creator:", creator.uid)

        // Query for videos
        const videosQuery = query(collection(db, "videos"), where("uid", "==", creator.uid), limit(50))

        // Execute query
        const snapshot = await getDocs(videosQuery)
        console.log(`Query results: ${snapshot.size} videos found`)

        // Track Firestore reads
        trackFirestoreRead("CreatorProfile", snapshot.size)

        // Process videos
        const videos = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title || "Untitled",
            thumbnailUrl: data.thumbnailUrl || "",
            url: data.url || "",
            type: data.type || "free",
            status: data.status || "active",
            isPublic: data.isPublic !== false,
            uid: data.uid || "",
            username: data.username || "",
            views: data.views || 0,
            likes: data.likes || 0,
          }
        })

        // Filter videos by type
        const free = videos.filter((v) => v.type === "free" && v.status === "active")
        const premium = videos.filter((v) => v.type === "premium" && v.status === "active")

        setFreeClips(free)
        setPaidClips(premium)
        console.log(`Loaded ${free.length} free clips and ${premium.length} premium clips`)
      } catch (error) {
        console.error("Error fetching videos:", error)
        setError("Failed to load videos. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
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
      router.push("/dashboard/upload")
    }
  }

  // New simplified delete function
  const confirmDeleteVideo = (videoId: string) => {
    setShowDeleteConfirm(videoId)
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!user) return

    try {
      setDeletingVideoId(videoId)
      console.log("Deleting video:", videoId)

      const response = await fetch(`/api/delete-video?videoId=${videoId}&userId=${user.uid}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete video")
      }

      // Remove video from local state
      setFreeClips((prev) => prev.filter((v) => v.id !== videoId))
      setPaidClips((prev) => prev.filter((v) => v.id !== videoId))

      console.log("Video deleted successfully")
    } catch (error) {
      console.error("Error deleting video:", error)
      alert("Failed to delete video. Please try again.")
    } finally {
      setDeletingVideoId(null)
      setShowDeleteConfirm(null)
    }
  }

  // Handle Buy Now button click for creator profile
  const handleBuyNow = async () => {
    if (!user) {
      // Redirect to login if user is not logged in
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    if (!creator.stripePriceId) {
      console.error("No price ID available for this creator")
      return
    }

    try {
      setIsLoading(true)

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: creator.stripePriceId,
          customerEmail: user.email,
          creatorId: creator.uid,
          creatorUsername: creator.username,
          metadata: {
            type: "creator_premium",
            creatorId: creator.uid,
            userId: user.uid,
          },
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { sessionId } = await res.json()
      const stripe = await getStripe()

      if (stripe) {
        await stripe.redirectToCheckout({ sessionId })
      } else {
        throw new Error("Failed to initialize Stripe")
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Buy Now button click for individual video
  const handleBuyVideo = async (videoId: string) => {
    if (!user) {
      // Redirect to login if user is not logged in
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    if (!creator.stripePriceId) {
      console.error("No price ID available for this creator")
      return
    }

    try {
      setIsLoading(true)

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: creator.stripePriceId,
          customerEmail: user.email,
          creatorId: creator.uid,
          creatorUsername: creator.username,
          metadata: {
            type: "video_premium",
            videoId: videoId,
            creatorId: creator.uid,
            userId: user.uid,
          },
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { sessionId } = await res.json()
      const stripe = await getStripe()

      if (stripe) {
        await stripe.redirectToCheckout({ sessionId })
      } else {
        throw new Error("Failed to initialize Stripe")
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Video card component with inline playback
  const VideoCard = ({ video }: { video: VideoItem }) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const hasUserPurchased = userPurchases[video.id] || false
    const isPremium = video.type === "premium"
    const showLockOverlay = isPremium && !hasUserPurchased && !isOwner

    const togglePlay = (e: React.MouseEvent) => {
      e.preventDefault()

      // If premium and not purchased, don't play
      if (showLockOverlay) {
        handleBuyVideo(video.id)
        return
      }

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

    return (
      <div
        className="group relative transition-all duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Video container with 9:16 aspect ratio */}
        <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 shadow-md ring-0 ring-white/30 transition-all duration-300 group-hover:ring-1">
          {/* Raw video element */}
          <video
            ref={videoRef}
            className={cn("w-full h-full object-cover cursor-pointer", showLockOverlay && "brightness-50 blur-sm")}
            poster={video.thumbnailUrl || undefined}
            preload="metadata"
            muted={false}
            playsInline
            onEnded={handleVideoEnd}
            onClick={togglePlay}
            controls={false}
          >
            <source src={video.url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Premium badge - only show on hover */}
          {isPremium && !showLockOverlay && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-amber-400 to-amber-600 text-black text-xs font-medium px-2 py-0.5 rounded-full shadow-sm z-10">
              PRO
            </div>
          )}

          {/* Lock overlay for premium content */}
          {showLockOverlay && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white z-20">
              <Lock className="h-10 w-10 text-amber-500 mb-2" />
              <p className="text-lg font-semibold">Premium Content</p>
              <p className="mb-3 text-sm text-zinc-300">Unlock for ${(creator.premiumPrice || 9.99).toFixed(2)}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleBuyVideo(video.id)
                }}
                className="bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black font-medium px-4 py-2 rounded-md shadow-md flex items-center"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Unlock Now
              </button>
            </div>
          )}

          {/* Delete button - only show for owner on hover */}
          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                confirmDeleteVideo(video.id)
              }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 w-8 h-8 rounded-full bg-red-600/80 hover:bg-red-700 flex items-center justify-center text-white"
              aria-label="Delete video"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {/* Play/Pause button - only show on hover and not for locked content */}
          {!showLockOverlay && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:bg-black/70"
                aria-label={isPlaying ? "Pause video" : "Play video"}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
            </div>
          )}

          {/* Overlay gradient for better visibility - only on hover */}
          {!showLockOverlay && (
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          )}
        </div>

        {/* Video title */}
        <div className="mt-2">
          <h3 className="text-sm text-white font-light line-clamp-2">{video.title}</h3>
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
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-400 text-4xl font-light">
                      {creator.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Premium indicator */}
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-600 text-black text-xs font-bold px-2.5 py-0.5 rounded-full shadow-lg">
                  PRO
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-semibold text-white mb-1 tracking-tight">
                  {creator.displayName}
                </h1>
                <p className="text-zinc-400 text-sm mb-4">@{creator.username}</p>

                {creator.bio && (
                  <div className="relative max-w-2xl mb-6 text-sm bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50 backdrop-blur-sm">
                    <p className="text-zinc-300">{creator.bio}</p>
                  </div>
                )}

                {/* Premium Content Buy Now Button - only show if premium is enabled and user is not the owner */}
                {creator.premiumEnabled && creator.stripePriceId && !isOwner && paidClips.length > 0 && (
                  <div className="mb-6">
                    <Button
                      onClick={handleBuyNow}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black font-semibold px-6 py-2 rounded-md shadow-lg"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Unlock All Premium – ${(creator.premiumPrice || 9.99).toFixed(2)}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Stats Cards Row */}
                <div className="grid grid-cols-3 gap-3 max-w-md mb-6">
                  <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center">
                    <Calendar className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                    <p className="text-xs text-zinc-400">Member since</p>
                    <p className="text-sm font-medium text-white">{formatDate(creator.createdAt)}</p>
                  </div>
                  <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center">
                    <Film className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                    <p className="text-xs text-zinc-400">Free clips</p>
                    <p className="text-sm font-medium text-white">{freeClips.length}</p>
                  </div>
                  <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center">
                    <Lock className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                    <p className="text-xs text-zinc-400">Premium clips</p>
                    <p className="text-sm font-medium text-white">{paidClips.length}</p>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 hover:bg-zinc-800 text-white"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>

                {isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 hover:bg-zinc-800 text-white"
                    onClick={() => router.push("/dashboard/profile/edit")}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
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
                  {freeClips.map((video) => (
                    <VideoCard key={video.id} video={video} />
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
                        onClick={() => router.push("/dashboard/upload")}
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
            <div>
              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
                </div>
              ) : paidClips.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {paidClips.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="max-w-md mx-auto bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                      <Lock className="h-8 w-8 text-zinc-600" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">No Premium Content Yet</h3>
                    <p className="text-zinc-400 mb-6">
                      {isOwner
                        ? "Add premium content to monetize your work and provide exclusive value to your subscribers."
                        : `${creator.displayName} hasn't shared any premium content yet.`}
                    </p>

                    {isOwner && (
                      <Button
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
                        onClick={() => router.push("/dashboard/upload?premium=true")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Premium Content
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-2">Delete Video</h3>
            <p className="text-zinc-300 mb-6">
              Are you sure you want to delete this video? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
                className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={() => showDeleteConfirm && handleDeleteVideo(showDeleteConfirm)}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deletingVideoId === showDeleteConfirm}
              >
                {deletingVideoId === showDeleteConfirm ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete Video"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
