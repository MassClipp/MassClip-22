"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Share2, Play, Calendar, Users, Heart, Check, Package, Download, Pause, Lock, ChevronDown } from "lucide-react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { doc, updateDoc, increment } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import ImageCard from "@/components/image-card"
import AudioCard from "@/components/audio-card"

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
  const [contentTypeFilter, setContentTypeFilter] = useState<"all" | "video" | "audio" | "image">("all")
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
          console.log("🎬 Free content API response:", freeData)

          // Log each content item to debug fileUrl
          freeData.content?.forEach((item: any, index: number) => {
            console.log(`📹 Free content item ${index}:`, {
              id: item.id,
              title: item.title,
              fileUrl: item.fileUrl,
              thumbnailUrl: item.thumbnailUrl,
            })
          })

          setFreeContent(freeData.content || [])
          setFreeContentCount(freeData.content?.length || 0)
        } else {
          console.error("Failed to fetch free content:", freeResponse.status)
        }

        // Fetch premium content from bundles collection
        const premiumResponse = await fetch(`/api/creator/${creator.uid}/premium-content`)
        if (premiumResponse.ok) {
          const premiumData = await premiumResponse.json()
          console.log("🎯 Premium content response:", premiumData)
          console.log("🎯 Premium content items:", premiumData.content)

          // Log each premium item for debugging
          premiumData.content?.forEach((item: any, index: number) => {
            console.log(`🎯 Premium content item ${index}:`, {
              id: item.id,
              title: item.title,
              thumbnailUrl: item.thumbnailUrl,
              stripePriceId: item.stripePriceId,
              stripeProductId: item.stripeProductId,
              price: item.price,
              contentCount: item.contentCount,
            })
          })

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

  const getAvailableContentTypes = (content: ContentItem[]) => {
    const types = new Set<string>()
    content.forEach((item) => {
      const contentType = detectContentType(item.fileUrl, item.type as string)
      types.add(contentType)
    })
    console.log("[v0] Available content types:", Array.from(types)) // Added debug logging for content types
    return Array.from(types)
  }

  const getFilteredContent = () => {
    if (activeTab !== "free" || contentTypeFilter === "all") {
      return currentContent
    }

    return freeContent.filter((item) => {
      const contentType = detectContentType(item.fileUrl, item.type as string)
      return contentType === contentTypeFilter
    })
  }

  const currentContent = activeTab === "free" ? freeContent : premiumContent
  const filteredContent = getFilteredContent()
  const availableTypes = activeTab === "free" ? getAvailableContentTypes(freeContent) : []
  const showContentTypeFilter = activeTab === "free" && availableTypes.length > 1

  console.log("[v0] Content filter state:", {
    // Added debug logging for filter state
    activeTab,
    availableTypes,
    showContentTypeFilter,
    freeContentLength: freeContent.length,
    contentTypeFilter,
  })

  useEffect(() => {
    if (activeTab === "premium") {
      setContentTypeFilter("all")
    }
  }, [activeTab])

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

      <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        {/* Header - Mobile Tree Layout */}
        <div className="mb-8 sm:mb-16">
          {/* Mobile Layout - Vertical Tree */}
          <div className="block sm:hidden">
            <div className="flex flex-col items-center text-center space-y-4 mb-6">
              {/* Profile Picture */}
              <Avatar className="w-24 h-24 border-2 border-white/20">
                <AvatarImage
                  src={creator.profilePic || "/placeholder.svg"}
                  alt={creator.displayName}
                  className="object-cover"
                />
                <AvatarFallback className="bg-zinc-900 text-white text-2xl font-medium border-2 border-white/20">
                  {creator.displayName?.charAt(0)?.toUpperCase() || creator.username?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              {/* Name and Username */}
              <div className="space-y-1">
                <h1 className="text-2xl font-light text-white tracking-tight">
                  {creator.displayName || creator.username}
                </h1>
                <p className="text-zinc-500 text-sm font-mono">@{creator.username}</p>
              </div>

              {/* Bio */}
              {creator.bio && <p className="text-zinc-400 text-sm max-w-sm leading-relaxed">{creator.bio}</p>}

              {/* Share Button */}
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

          {/* Desktop Layout - Horizontal */}
          <div className="hidden sm:flex items-start justify-between">
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
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center sm:justify-start gap-4 sm:gap-8 mb-8 sm:mb-12 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-zinc-500">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Member since {getMemberSince()}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{freeContentCount} free</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{premiumContentCount} premium</span>
          </div>
        </div>

        {/* Tabs with underline style and content type filter */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-center sm:justify-start gap-6 sm:gap-8 border-b border-zinc-800/50">
            {showContentTypeFilter && (
              <div className="relative">
                <select
                  value={contentTypeFilter}
                  onChange={(e) => setContentTypeFilter(e.target.value as "all" | "video" | "audio" | "image")}
                  className="appearance-none bg-transparent border-none text-white text-sm focus:outline-none cursor-pointer hover:text-zinc-300 transition-colors duration-200"
                >
                  <option value="all">All</option>
                  {availableTypes.includes("video") && <option value="video">Videos</option>}
                  {availableTypes.includes("audio") && <option value="audio">Audio</option>}
                  {availableTypes.includes("image") && <option value="image">Images</option>}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("free")}
                className={`pb-3 sm:pb-4 text-xs sm:text-sm font-medium transition-all duration-200 relative ${
                  activeTab === "free" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                Free Content
                {activeTab === "free" && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
              </button>
            </div>

            <button
              onClick={() => setActiveTab("premium")}
              className={`pb-3 sm:pb-4 text-xs sm:text-sm font-medium transition-all duration-200 relative ${
                activeTab === "premium" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Premium Content
              {activeTab === "premium" && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="pt-4 sm:pt-8">
          {loading ? (
            <div className="flex items-center justify-center py-16 sm:py-24">
              <div className="w-6 h-6 border border-zinc-800 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : filteredContent.length > 0 ? (
            <div
              className={
                activeTab === "premium"
                  ? "flex flex-col items-center gap-6 sm:grid sm:grid-cols-3 sm:gap-8 sm:justify-items-center"
                  : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 justify-items-center"
              }
            >
              {filteredContent.map((item) =>
                activeTab === "premium" ? (
                  <div key={item.id} className="w-full max-w-[180px] sm:max-w-[200px]">
                    <div className="relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden mb-2">
                      <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
                        <div className="text-center">
                          <Package className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                          <p className="text-xs text-zinc-500">Bundle unavailable</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3
                        className="text-white text-xs sm:text-sm font-medium line-clamp-2 leading-tight"
                        title={item.title}
                      >
                        {item.title}
                      </h3>
                    </div>
                  </div>
                ) : (
                  <ContentCard key={item.id} item={item} />
                ),
              )}
            </div>
          ) : (
            <div className="text-center py-16 sm:py-24">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 sm:mb-6 bg-zinc-900 rounded-full flex items-center justify-center">
                {activeTab === "premium" ? (
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600" />
                ) : (
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600" />
                )}
              </div>
              <h3 className="text-base sm:text-lg font-medium text-white mb-2">
                No {contentTypeFilter !== "all" ? contentTypeFilter : activeTab} content available
              </h3>
              <p className="text-zinc-500 text-xs sm:text-sm">
                {contentTypeFilter !== "all"
                  ? `This creator hasn't uploaded any ${contentTypeFilter} content yet.`
                  : `This creator hasn't uploaded any ${activeTab} content yet.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const detectContentType = (fileUrl: string, mimeType?: string): "video" | "audio" | "image" => {
  // First check MIME type if available
  if (mimeType) {
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    if (mimeType.startsWith("image/")) return "image"
  }

  // Fallback to file extension detection
  const extension = fileUrl.split(".").pop()?.toLowerCase()

  // Video extensions
  if (["mp4", "mov", "avi", "mkv", "webm", "m4v"].includes(extension || "")) {
    return "video"
  }

  // Audio extensions
  if (["mp3", "wav", "flac", "aac", "m4a", "ogg", "wma"].includes(extension || "")) {
    return "audio"
  }

  // Image extensions
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(extension || "")) {
    return "image"
  }

  // Default to video for unknown types
  return "video"
}

function ContentCard({ item }: { item: ContentItem }) {
  const contentType = detectContentType(item.fileUrl, item.type as string)

  const transformedItem = {
    id: item.id,
    title: item.title,
    fileUrl: item.fileUrl,
    thumbnailUrl: item.thumbnailUrl,
    creatorName: "", // Not available in current data structure
    uid: "", // Not available in current data structure
    duration: item.duration ? Number.parseInt(item.duration) : undefined,
    size: 0, // Not available in current data structure
  }

  if (contentType === "image") {
    console.log("[v0] ImageCard data:", {
      id: transformedItem.id,
      title: transformedItem.title,
      fileUrl: transformedItem.fileUrl,
      thumbnailUrl: transformedItem.thumbnailUrl,
      contentType,
    })
  }

  switch (contentType) {
    case "image":
      return (
        <div className="w-full max-w-[180px] sm:max-w-[200px]">
          <ImageCard image={transformedItem} className="w-full" />
        </div>
      )

    case "audio":
      return (
        <div className="w-full max-w-[180px] sm:max-w-[200px]">
          <AudioCard audio={transformedItem} className="w-full" />
        </div>
      )

    case "video":
    default:
      return <VideoContentCard item={item} />
  }
}

function VideoContentCard({ item }: { item: ContentItem }) {
  const [user] = useAuthState(auth)
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast } = useToast()
  const { hasReachedLimit, isProUser, forceRefresh } = useDownloadLimit()

  console.log("🎥 ContentCard rendering with:", {
    id: item.id,
    title: item.title,
    fileUrl: item.fileUrl,
    thumbnailUrl: item.thumbnailUrl,
  })

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

    if (!videoRef.current || !item.fileUrl) {
      console.error("❌ No video element or file URL available")
      return
    }

    if (isPlaying) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setIsPlaying(false)
    } else {
      // Pause all other videos
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
          console.error("❌ Error playing video:", error)
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
      const success = await startDirectDownload(item.fileUrl, filename)

      if (!success) {
        const link = document.createElement("a")
        link.href = item.fileUrl
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
        className={`relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden mb-2 transition-all duration-300 ${
          isHovered ? "border border-white/50" : "border border-transparent"
        }`}
      >
        {item.fileUrl ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            preload="metadata"
            muted
            playsInline
            controls={false}
          >
            <source src={item.fileUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
            <div className="text-center">
              <Play className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">Video unavailable</p>
            </div>
          </div>
        )}

        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
            isHovered || !isPlaying ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={handlePlayPause}
            disabled={!item.fileUrl}
            className="bg-white/20 backdrop-blur-sm rounded-full p-2 transition-transform duration-300 hover:scale-110 disabled:opacity-50"
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            ) : (
              <Play className="h-4 w-4 sm:h-5 sm:w-5 text-white ml-0.5" />
            )}
          </button>
        </div>

        {item.fileUrl && (
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
