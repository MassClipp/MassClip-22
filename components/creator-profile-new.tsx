"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Calendar, Share2, RefreshCw, Play, Download, Clock, Eye, Heart, MoreHorizontal } from "lucide-react"

interface CreatorData {
  uid: string
  username: string
  displayName: string
  bio?: string
  profilePic?: string
  createdAt?: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    youtube?: string
    website?: string
  }
}

interface CreatorProfileNewProps {
  creator: CreatorData
}

interface ContentItem {
  id: string
  title: string
  thumbnailUrl: string
  duration: string
  views: number
  downloads: number
  type: "video" | "audio" | "image"
  isPremium: boolean
}

export default function CreatorProfileNew({ creator }: CreatorProfileNewProps) {
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const [freeContent, setFreeContent] = useState<ContentItem[]>([])
  const [premiumContent, setPremiumContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [freeContentCount, setFreeContentCount] = useState(0)
  const [premiumContentCount, setPremiumContentCount] = useState(0)

  // Get member since date
  const getMemberSince = () => {
    if (creator.createdAt) {
      const date = new Date(creator.createdAt)
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    }
    return "Recently"
  }

  // Fetch content data
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)

        // Fetch free content
        const freeResponse = await fetch(`/api/creator/${creator.uid}/free-content`)
        if (freeResponse.ok) {
          const freeData = await freeResponse.json()
          setFreeContent(freeData.content || [])
          setFreeContentCount(freeData.content?.length || 0)
        }

        // Fetch premium content
        const premiumResponse = await fetch(`/api/creator/${creator.uid}/premium-content`)
        if (premiumResponse.ok) {
          const premiumData = await premiumResponse.json()
          setPremiumContent(premiumData.content || [])
          setPremiumContentCount(premiumData.content?.length || 0)
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
  const currentCount = activeTab === "free" ? freeContentCount : premiumContentCount

  return (
    <div className="min-h-screen bg-black">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="container mx-auto px-6 py-12 max-w-7xl">
          {/* Profile Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 mb-12">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-32 h-32 lg:w-40 lg:h-40 border-4 border-red-500 shadow-2xl">
                <AvatarImage
                  src={creator.profilePic || "/placeholder.svg"}
                  alt={creator.displayName}
                  className="object-cover"
                />
                <AvatarFallback className="bg-zinc-900 text-white text-4xl font-bold border-4 border-red-500">
                  {creator.displayName?.charAt(0)?.toUpperCase() || creator.username?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-black" />
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-6">
              {/* Name and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
                    {creator.displayName || creator.username}
                  </h1>
                  <p className="text-xl text-zinc-400">@{creator.username}</p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-red-600/25"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Follow
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-zinc-700 hover:bg-zinc-800 bg-transparent text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-zinc-700 hover:bg-zinc-800 bg-transparent text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Bio */}
              {creator.bio && <p className="text-lg text-zinc-300 max-w-2xl leading-relaxed">{creator.bio}</p>}

              {/* Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 bg-zinc-900/50 backdrop-blur-sm px-4 py-3 rounded-xl border border-zinc-800">
                  <Calendar className="w-5 h-5 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Member since</p>
                    <p className="text-white font-semibold">{getMemberSince()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900/50 backdrop-blur-sm px-4 py-3 rounded-xl border border-zinc-800">
                  <Users className="w-5 h-5 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Free content</p>
                    <p className="text-white font-semibold">{freeContentCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900/50 backdrop-blur-sm px-4 py-3 rounded-xl border border-zinc-800">
                  <Heart className="w-5 h-5 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Premium content</p>
                    <p className="text-white font-semibold">{premiumContentCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Tabs */}
          <div className="mb-8">
            <div className="flex items-center gap-1 bg-zinc-900/30 backdrop-blur-sm p-1 rounded-2xl border border-zinc-800 w-fit">
              <button
                onClick={() => setActiveTab("free")}
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === "free"
                    ? "bg-red-600 text-white shadow-lg"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                Free Content
                {freeContentCount > 0 && <Badge className="ml-2 bg-zinc-700 text-white">{freeContentCount}</Badge>}
              </button>
              <button
                onClick={() => setActiveTab("premium")}
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === "premium"
                    ? "bg-red-600 text-white shadow-lg"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                Premium Content
                {premiumContentCount > 0 && (
                  <Badge className="ml-2 bg-zinc-700 text-white">{premiumContentCount}</Badge>
                )}
              </button>
            </div>
          </div>

          {/* Content Grid */}
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
              </div>
            ) : currentContent.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentContent.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-24 h-24 mx-auto mb-6 bg-zinc-900 rounded-full flex items-center justify-center">
                  <Play className="w-10 h-10 text-zinc-600" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">No {activeTab} content available</h3>
                <p className="text-zinc-400 text-lg">This creator hasn't uploaded any {activeTab} content yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Content Card Component
function ContentCard({ item }: { item: ContentItem }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800 hover:border-zinc-700 transition-all duration-300 group overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-zinc-800 overflow-hidden">
          <img
            src={item.thumbnailUrl || "/placeholder.svg?height=200&width=300"}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Overlay */}
          <div
            className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-200 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex gap-2">
              <Button size="sm" className="bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                <Play className="w-4 h-4" />
              </Button>
              <Button size="sm" className="bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Duration */}
          <Badge className="absolute bottom-2 right-2 bg-black/80 text-white text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {item.duration}
          </Badge>

          {/* Premium badge */}
          {item.isPremium && <Badge className="absolute top-2 left-2 bg-red-600 text-white text-xs">PREMIUM</Badge>}
        </div>

        {/* Content Info */}
        <div className="p-4">
          <h3 className="font-semibold text-white text-sm line-clamp-2 mb-3" title={item.title}>
            {item.title}
          </h3>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {item.views.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {item.downloads.toLocaleString()}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-zinc-400 hover:text-white">
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
