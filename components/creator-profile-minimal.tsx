"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Share2, Play, Calendar, Users, Heart, Check, Package, Unlock, Download, Pause } from "lucide-react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"

interface CreatorData {
  uid: string
  username: string
  displayName: string
  bio?: string
  profilePic?: string
  createdAt?: string
}

interface CreatorProfileMinimalProps {
  creator: CreatorData
}

interface ContentItem {
  id: string
  title: string
  thumbnailUrl: string
  fileUrl: string
  duration: string
  views: number
  type: "video" | "audio" | "image" | "bundle"
  isPremium: boolean
  price?: number
  contentCount?: number
  description?: string
  stripePriceId?: string
  stripeProductId?: string
  content?: any[]
}

export default function CreatorProfileMinimal({ creator }: CreatorProfileMinimalProps) {
  const [user] = useAuthState(auth)
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const [freeContent, setFreeContent] = useState<ContentItem[]>([])
  const [premiumContent, setPremiumContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [freeContentCount, setFreeContentCount] = useState(0)
  const [premiumContentCount, setPremiumContentCount] = useState(0)
  const [showToast, setShowToast] = useState(false)

  const getMemberSince = () => {
    if (creator.createdAt) {
      // Handle different date formats
      let date: Date

      if (typeof creator.createdAt === "string") {
        // Try parsing as ISO string first
        if (creator.createdAt.includes("T") || creator.createdAt.includes("-")) {
          date = new Date(creator.createdAt)
        } else {
          // Handle timestamp strings
          const timestamp = Number.parseInt(creator.createdAt)
          date = new Date(timestamp)
        }
      } else {
        date = new Date(creator.createdAt)
      }

      // Check if date is valid
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      }
    }
    return "Recently"
  }

  const handleShare = async () => {
    try {
      const url = window.location.href
      await navigator.clipboard.writeText(url)

      // Show toast notification
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 1000)
    } catch (err) {
      console.error("Failed to copy URL:", err)
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = window.location.href
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)

      // Show toast even for fallback
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 1000)
    }
  }

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)

        // Fetch free content from free_content collection
        const freeResponse = await fetch(`/api/creator/${creator.uid}/free-content`)
        if (freeResponse.ok) {
          const freeData = await freeResponse.json()
          console.log("Free content response:", freeData)
          setFreeContent(freeData.content || [])
          setFreeContentCount(freeData.content?.length || 0)
        } else {
          console.error("Failed to fetch free content:", freeResponse.status)
        }

        // Fetch premium content from bundles collection
        const premiumResponse = await fetch(`/api/creator/${creator.uid}/premium-content`)
        if (premiumResponse.ok) {
          const premiumData = await premiumResponse.json()
          console.log("Premium content response:", premiumData)
          console.log("Premium content items:", premiumData.content)
          setPremiumContent(premiumData.content || [])
          setPremiumContentCount(premiumData.content?.length || 0)
        } else {
          console.error("Failed to fetch premium content:", premiumResponse.status)
        }
      } catch (error) {
        console.error("Error fetching content:", error)
      } finally {
        setLoading(false)
      }
    }

    if (creator.uid) {
      fetchContent()
    }
  }, [creator.uid])

  const currentContent = activeTab === "free" ? freeContent : premiumContent

  return (
    <div className="min-h-screen bg-black relative">
      {/* Enhanced subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-black to-zinc-800/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/30 via-transparent to-zinc-800/10 pointer-events-none" />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 bg-white text-black px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Link copied to clipboard</span>
        </div>
      )}

      <div className="relative max-w-6xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="flex items-start justify-between mb-16">
          <div className="flex items-center gap-8">
            <Avatar className="w-32 h-32 border-2 border-white/20">
              <AvatarImage
                src={creator.profilePic || "/placeholder.svg"}
                alt={creator.displayName}
                className="object-cover"
              />
              <AvatarFallback className="bg-zinc-900 text-white text-2xl font-medium border-2 border-white/20">
                {creator.displayName?.charAt(0)?.toUpperCase() || creator.username?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-3">
              <div>
                <h1 className="text-3xl font-light text-white tracking-tight">
                  {creator.displayName || creator.username}
                </h1>
                <p className="text-zinc-500 text-sm font-mono">@{creator.username}</p>
              </div>

              {creator.bio && <p className="text-zinc-400 text-sm max-w-md leading-relaxed">{creator.bio}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="text-zinc-400 hover:text-white hover:bg-zinc-900 h-9 w-9 rounded-full p-0"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8 mb-12 text-sm">
          <div className="flex items-center gap-2 text-zinc-500">
            <Calendar className="w-4 h-4" />
            <span>Member since {getMemberSince()}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <Users className="w-4 h-4" />
            <span>{freeContentCount} free</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <Heart className="w-4 h-4" />
            <span>{premiumContentCount} premium</span>
          </div>
        </div>

        {/* Tabs with underline style */}
        <div className="mb-8">
          <div className="flex items-center gap-8 border-b border-zinc-800/50">
            <button
              onClick={() => setActiveTab("free")}
              className={`pb-4 text-sm font-medium transition-all duration-200 relative ${
                activeTab === "free" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Free Content
              {activeTab === "free" && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
            </button>
            <button
              onClick={() => setActiveTab("premium")}
              className={`pb-4 text-sm font-medium transition-all duration-200 relative ${
                activeTab === "premium" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Premium Content
              {activeTab === "premium" && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="pt-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-6 h-6 border border-zinc-800 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : currentContent.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 justify-items-center">
              {currentContent.map((item) =>
                activeTab === "premium" ? (
                  <BundleCard key={item.id} item={item} user={user} />
                ) : (
                  <ContentCard key={item.id} item={item} />
                ),
              )}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-12 h-12 mx-auto mb-6 bg-zinc-900 rounded-full flex items-center justify-center">
                {activeTab === "premium" ? (
                  <Package className="w-5 h-5 text-zinc-600" />
                ) : (
                  <Play className="w-5 h-5 text-zinc-600" />
                )}
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No {activeTab} content available</h3>
              <p className="text-zinc-500 text-sm">This creator hasn't uploaded any {activeTab} content yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ContentCard({ item }: { item: ContentItem }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [thumbnailError, setThumbnailError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  console.log("🎥 ContentCard video URL:", item.fileUrl)

  const handlePlayPause = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

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

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const response = await fetch(item.fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${item.title}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  const handleThumbnailError = () => {
    setThumbnailError(true)
  }

  // Update state when video plays/pauses
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
      className="group cursor-pointer w-full max-w-[200px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 9:16 aspect ratio video container - smaller size */}
      <div
        className={`relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden mb-2 transition-all duration-300 ${
          isHovered ? "border border-white/50" : "border border-transparent"
        }`}
      >
        {/* Video element */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          poster={
            thumbnailError
              ? `/placeholder.svg?height=356&width=200&query=${encodeURIComponent(item.title)}`
              : item.thumbnailUrl || "/placeholder.svg?height=356&width=200"
          }
          preload="metadata"
          muted={false}
          playsInline
          controls={false}
          onError={handleThumbnailError}
        >
          <source src={item.fileUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Play/Pause overlay */}
        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
            isHovered || !isPlaying ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={handlePlayPause}
            className="bg-white/20 backdrop-blur-sm rounded-full p-2 transition-transform duration-300 hover:scale-110"
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}
          </button>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          className={`absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-full transition-all duration-200 hover:bg-black/80 hover:scale-110 ${
            isHovered ? "opacity-100" : "opacity-70"
          }`}
          aria-label="Download video"
        >
          <Download className="h-3 w-3 text-white" />
        </button>
      </div>

      {/* Video info - only title, no view count */}
      <div className="space-y-1">
        <h3 className="text-white text-xs font-medium line-clamp-2 leading-tight" title={item.title}>
          {item.title}
        </h3>
      </div>
    </div>
  )
}

function BundleCard({ item, user }: { item: ContentItem; user: any }) {
  const [isThumbnailHovered, setIsThumbnailHovered] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [imageError, setImageError] = useState(false)

  console.log("🎯 BundleCard rendering with item:", {
    id: item.id,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl,
    stripePriceId: item.stripePriceId,
    price: item.price,
    contentCount: item.contentCount,
  })

  const handleUnlock = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    console.log("🔓 Unlock button clicked for bundle:", item.id)

    if (!item.stripePriceId) {
      console.error("❌ No Stripe price ID available for this bundle")
      alert("This bundle is not available for purchase at the moment.")
      return
    }

    setIsUnlocking(true)

    try {
      let idToken = null

      // Get Firebase ID token if user is authenticated
      if (user) {
        try {
          idToken = await user.getIdToken()
          console.log("✅ Got Firebase ID token for checkout")
        } catch (error) {
          console.error("❌ Failed to get ID token:", error)
        }
      }

      console.log("💳 Creating checkout session with:", {
        priceId: item.stripePriceId,
        bundleId: item.id,
        hasIdToken: !!idToken,
      })

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          priceId: item.stripePriceId,
          bundleId: item.id,
          successUrl: `${window.location.origin}/purchase-success?bundle_id=${item.id}`,
          cancelUrl: window.location.href,
        }),
      })

      console.log("📡 Checkout API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ Checkout session creation failed:", errorData)
        alert(`Failed to create checkout session: ${errorData.error}`)
        return
      }

      const { url } = await response.json()
      console.log("✅ Checkout session created, URL:", url)

      if (url) {
        console.log("🚀 Redirecting to Stripe checkout:", url)
        window.location.href = url
      } else {
        console.error("❌ No checkout URL received")
        alert("Failed to create checkout session")
      }
    } catch (error) {
      console.error("❌ Error creating checkout session:", error)
      alert("An error occurred while creating the checkout session")
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleImageError = () => {
    console.log("❌ Image failed to load:", item.thumbnailUrl)
    setImageError(true)
  }

  const handleImageLoad = () => {
    console.log("✅ Image loaded successfully:", item.thumbnailUrl)
    setImageError(false)
  }

  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-700/30 hover:border-zinc-600/40 transition-all duration-300 w-full max-w-sm">
      {/* Thumbnail Section */}
      <div
        className="relative aspect-square bg-zinc-800 overflow-hidden"
        onMouseEnter={() => setIsThumbnailHovered(true)}
        onMouseLeave={() => setIsThumbnailHovered(false)}
      >
        {item.thumbnailUrl && !imageError ? (
          <img
            src={item.thumbnailUrl || "/placeholder.svg"}
            alt={item.title}
            className={`w-full h-full object-cover transition-transform duration-500 ${isThumbnailHovered ? "scale-110" : "scale-100"}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <Package className="w-16 h-16 text-zinc-600" />
          </div>
        )}

        {/* Content count badge */}
        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-white font-semibold">
          {item.contentCount || 0} items
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3 bg-black">
        {/* Title and Description */}
        <div className="space-y-1">
          <h3 className="text-white text-base font-bold line-clamp-1" title={item.title}>
            {item.title}
          </h3>
          <p className="text-zinc-400 text-xs line-clamp-1">{item.description || "Premium content bundle"}</p>
        </div>

        {/* Price and Button Row */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-white text-xl font-light">${item.price?.toFixed(2) || "0.00"}</span>

          <button
            onClick={handleUnlock}
            disabled={isUnlocking || !item.stripePriceId}
            className="bg-white text-black hover:bg-gray-100 active:bg-gray-200 font-semibold px-4 py-2 text-sm rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUnlocking ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                Unlock
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
