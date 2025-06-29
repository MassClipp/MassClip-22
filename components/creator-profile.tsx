"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Share, Calendar, Grid3X3, Instagram, ExternalLink, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { safelyConvertToDate } from "@/lib/date-utils"

interface Creator {
  uid?: string
  id?: string
  username: string
  displayName: string
  bio?: string
  profilePic?: string
  createdAt?: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    tiktok?: string
  }
  instagramHandle?: string
  xHandle?: string
  tiktokHandle?: string
  memberSince?: any
  freeContentCount?: number
  premiumContentCount?: number
}

interface CreatorProfileProps {
  creator: Creator
}

interface ContentItem {
  id: string
  title: string
  fileUrl: string
  thumbnailUrl?: string
  type: string
  mimeType?: string
  addedAt?: any
  createdAt?: any
}

export default function CreatorProfile({ creator }: CreatorProfileProps) {
  const { toast } = useToast()
  const [freeContent, setFreeContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const creatorId = creator.uid || creator.id || ""

  // Get member since date
  const getMemberSinceDate = () => {
    const date = safelyConvertToDate(creator.memberSince || creator.createdAt)
    if (!date || date.toString() === "Invalid Date") {
      return "Invalid Date"
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Fetch free content
  const fetchFreeContent = async (showRefreshToast = false) => {
    if (!creatorId) return

    try {
      if (showRefreshToast) setRefreshing(true)
      else setLoading(true)

      console.log(`🔍 Fetching free content for creator: ${creatorId}`)

      const response = await fetch(`/api/creator/${creatorId}/free-content`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch free content`)
      }

      const data = await response.json()
      console.log("✅ Free content response:", data)

      const contentItems = data.freeContent || []
      setFreeContent(contentItems)

      if (showRefreshToast) {
        toast({
          title: "Content Refreshed",
          description: `Found ${contentItems.length} free content items`,
        })
      }
    } catch (error) {
      console.error("❌ Error fetching free content:", error)
      toast({
        title: "Error",
        description: "Failed to load free content",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchFreeContent()
  }, [creatorId])

  // Handle share
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${creator.displayName} | MassClip`,
          text: creator.bio || `Check out ${creator.displayName}'s content on MassClip`,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast({
          title: "Link Copied",
          description: "Profile link copied to clipboard",
        })
      }
    } catch (error) {
      console.error("Share failed:", error)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Profile Info */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {/* Profile Picture */}
              <div className="flex justify-center mb-6">
                <Avatar className="w-32 h-32 border-4 border-orange-500">
                  <AvatarImage src={creator.profilePic || "/placeholder-user.jpg"} alt={creator.displayName} />
                  <AvatarFallback className="bg-zinc-800 text-white text-2xl">
                    {creator.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Profile Details */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-1">{creator.displayName}</h1>
                <p className="text-zinc-400 mb-4">@{creator.username}</p>
                {creator.bio && <p className="text-sm text-zinc-300 leading-relaxed">{creator.bio}</p>}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchFreeContent(true)}
                  disabled={refreshing}
                  className="flex-1 border-zinc-700 hover:border-zinc-600"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="flex-1 border-zinc-700 hover:border-zinc-600 bg-transparent"
                >
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>

              {/* Social Links */}
              {(creator.instagramHandle || creator.xHandle || creator.tiktokHandle) && (
                <div className="space-y-2 mb-6">
                  {creator.instagramHandle && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start border-zinc-700 hover:border-zinc-600 bg-transparent"
                      asChild
                    >
                      <a
                        href={`https://instagram.com/${creator.instagramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Instagram className="h-4 w-4 mr-2" />
                        Instagram
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    </Button>
                  )}
                  {creator.xHandle && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start border-zinc-700 hover:border-zinc-600 bg-transparent"
                      asChild
                    >
                      <a href={`https://x.com/${creator.xHandle}`} target="_blank" rel="noopener noreferrer">
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        X (Twitter)
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    </Button>
                  )}
                  {creator.tiktokHandle && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start border-zinc-700 hover:border-zinc-600 bg-transparent"
                      asChild
                    >
                      <a href={`https://tiktok.com/@${creator.tiktokHandle}`} target="_blank" rel="noopener noreferrer">
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                        </svg>
                        TikTok
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-3">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-orange-500/10 rounded-lg">
                      <Calendar className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400">Member since</p>
                      <p className="text-lg font-semibold">{getMemberSinceDate()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-orange-500/10 rounded-lg">
                      <Grid3X3 className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400">Free content</p>
                      <p className="text-lg font-semibold">{freeContent.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content Section */}
            <div className="space-y-6">
              {/* Content Tabs with Dropdown Icon */}
              <div className="flex items-center gap-2 border-b border-zinc-800">
                <ChevronDown className="h-4 w-4 text-zinc-400" />
                <div className="flex">
                  <button className="px-6 py-3 font-medium text-orange-500 border-b-2 border-orange-500">
                    Free Content
                  </button>
                  {(creator.premiumContentCount || 0) > 0 && (
                    <button className="px-6 py-3 font-medium text-zinc-400 hover:text-white transition-colors">
                      Premium Content
                    </button>
                  )}
                </div>
              </div>

              {/* Content Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-zinc-500" />
                  <span className="ml-3 text-zinc-400">Loading content...</span>
                </div>
              ) : freeContent.length === 0 ? (
                <div className="text-center py-12">
                  <Grid3X3 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">No free content available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {freeContent.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors group cursor-pointer">
                        <CardContent className="p-0">
                          {/* Thumbnail */}
                          <div className="aspect-video bg-zinc-800 rounded-t-lg overflow-hidden relative">
                            {item.thumbnailUrl ? (
                              <img
                                src={item.thumbnailUrl || "/placeholder.svg"}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = "none"
                                  target.nextElementSibling?.classList.remove("hidden")
                                }}
                              />
                            ) : null}
                            <div
                              className={`${item.thumbnailUrl ? "hidden" : ""} absolute inset-0 flex items-center justify-center text-zinc-500`}
                            >
                              <Grid3X3 className="h-8 w-8" />
                            </div>

                            {/* Content Type Badge */}
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="bg-black/50 text-white text-xs">
                                {item.type || "content"}
                              </Badge>
                            </div>
                          </div>

                          {/* Content Info */}
                          <div className="p-4">
                            <h3 className="font-medium text-white truncate mb-2" title={item.title}>
                              {item.title}
                            </h3>
                            <p className="text-xs text-zinc-400">
                              {safelyConvertToDate(item.addedAt || item.createdAt)?.toLocaleDateString() ||
                                "Recently added"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
