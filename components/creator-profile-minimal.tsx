"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Share2, Play, Calendar, Users, Heart, Check, Package } from "lucide-react"

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
  duration: string
  views: number
  type: "video" | "audio" | "image" | "bundle"
  isPremium: boolean
  price?: number
  contentCount?: number
}

export default function CreatorProfileMinimal({ creator }: CreatorProfileMinimalProps) {
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
            <Avatar className="w-20 h-20 border-2 border-white/20">
              <AvatarImage
                src={creator.profilePic || "/placeholder.svg"}
                alt={creator.displayName}
                className="object-cover"
              />
              <AvatarFallback className="bg-zinc-900 text-white text-xl font-medium border-2 border-white/20">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentContent.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
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

  return (
    <div
      className="group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden mb-3">
        <img
          src={item.thumbnailUrl || "/placeholder.svg?height=200&width=300"}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            {item.type === "bundle" ? (
              <Package className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </div>
        </div>

        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-mono">
          {item.type === "bundle" ? `${item.contentCount || 0} items` : item.duration}
        </div>

        {item.isPremium && (
          <div className="absolute top-3 left-3 bg-white text-black px-2 py-1 rounded text-xs font-medium">
            {item.price ? `$${item.price}` : "Premium"}
          </div>
        )}
      </div>

      <h3 className="text-white text-sm font-medium line-clamp-2 leading-snug" title={item.title}>
        {item.title}
      </h3>

      <p className="text-zinc-500 text-xs mt-1">{item.views.toLocaleString()} views</p>
    </div>
  )
}
