"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, Share, Calendar, Grid3X3, ChevronDown, Video, ImageIcon, File, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { safelyConvertToDate } from "@/lib/date-utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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

interface CreatorProfileWithSidebarProps {
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

export default function CreatorProfileWithSidebar({ creator }: CreatorProfileWithSidebarProps) {
  const { toast } = useToast()
  const [freeContent, setFreeContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [contentFilter, setContentFilter] = useState("all")

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

  // Get content type from mime type
  const getContentType = (mimeType: string): "video" | "image" | "file" => {
    if (!mimeType) return "file"
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("image/")) return "image"
    return "file"
  }

  // Filter content based on selected filter
  const filteredContent = freeContent.filter((item) => {
    if (contentFilter === "all") return true
    const contentType = getContentType(item.mimeType || item.type || "")
    return contentType === contentFilter
  })

  // Get available content types for filter
  const availableContentTypes = Array.from(
    new Set(freeContent.map((item) => getContentType(item.mimeType || item.type || ""))),
  )

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

              <Separator className="bg-zinc-800 mb-6" />

              {/* Social Links */}
              {(creator.instagramHandle || creator.xHandle || creator.tiktokHandle) && (
                <div className="space-y-2 text-sm">
                  {creator.instagramHandle && (
                    <div className="flex items-center text-zinc-400">
                      <span className="w-20">Instagram:</span>
                      <span>@{creator.instagramHandle}</span>
                    </div>
                  )}
                  {creator.xHandle && (
                    <div className="flex items-center text-zinc-400">
                      <span className="w-20">X:</span>
                      <span>@{creator.xHandle}</span>
                    </div>
                  )}
                  {creator.tiktokHandle && (
                    <div className="flex items-center text-zinc-400">
                      <span className="w-20">TikTok:</span>
                      <span>@{creator.tiktokHandle}</span>
                    </div>
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
              {/* Content Header with Filter Dropdown */}
              <div className="flex items-center gap-4">
                {/* Filter Dropdown */}
                {availableContentTypes.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 hover:border-zinc-600 bg-transparent"
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        {contentFilter === "all"
                          ? "All Content"
                          : contentFilter === "video"
                            ? "Videos"
                            : contentFilter === "image"
                              ? "Images"
                              : "Files"}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                      <DropdownMenuItem onClick={() => setContentFilter("all")} className="hover:bg-zinc-800">
                        <Grid3X3 className="h-4 w-4 mr-2" />
                        All Content
                      </DropdownMenuItem>
                      {availableContentTypes.includes("video") && (
                        <DropdownMenuItem onClick={() => setContentFilter("video")} className="hover:bg-zinc-800">
                          <Video className="h-4 w-4 mr-2" />
                          Videos
                        </DropdownMenuItem>
                      )}
                      {availableContentTypes.includes("image") && (
                        <DropdownMenuItem onClick={() => setContentFilter("image")} className="hover:bg-zinc-800">
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Images
                        </DropdownMenuItem>
                      )}
                      {availableContentTypes.includes("file") && (
                        <DropdownMenuItem onClick={() => setContentFilter("file")} className="hover:bg-zinc-800">
                          <File className="h-4 w-4 mr-2" />
                          Files
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Free Content Tab with Dropdown Icon */}
                <div className="flex items-center gap-2">
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                  <h2 className="text-xl font-semibold text-orange-500 border-b-2 border-orange-500 pb-1">
                    Free Content
                  </h2>
                </div>
              </div>

              {/* Content Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-zinc-500" />
                  <span className="ml-3 text-zinc-400">Loading content...</span>
                </div>
              ) : filteredContent.length === 0 ? (
                <div className="text-center py-12">
                  <Grid3X3 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">
                    {contentFilter === "all" ? "No free content available" : `No ${contentFilter} content available`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredContent.map((item, index) => (
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
                              {getContentType(item.mimeType || item.type || "") === "video" && (
                                <Video className="h-8 w-8" />
                              )}
                              {getContentType(item.mimeType || item.type || "") === "image" && (
                                <ImageIcon className="h-8 w-8" />
                              )}
                              {getContentType(item.mimeType || item.type || "") === "file" && (
                                <File className="h-8 w-8" />
                              )}
                            </div>

                            {/* Content Type Badge */}
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="bg-black/50 text-white text-xs">
                                {getContentType(item.mimeType || item.type || "")}
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
