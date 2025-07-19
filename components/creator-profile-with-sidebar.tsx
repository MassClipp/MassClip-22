"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Users, Instagram, Twitter, Youtube, Globe, Share2, UserPlus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import FilteredContentDisplay from "@/components/filtered-content-display"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
  email?: string
  updatedAt?: string
}

interface CreatorProfileWithSidebarProps {
  creator: CreatorData
}

export default function CreatorProfileWithSidebar({ creator }: CreatorProfileWithSidebarProps) {
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const [contentTypes, setContentTypes] = useState<string[]>([])
  const [selectedContentType, setSelectedContentType] = useState("all")
  const [stats, setStats] = useState({
    freeContentCount: 0,
    premiumContentCount: 0,
    totalViews: 0,
    followers: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch creator stats
    const fetchStats = async () => {
      try {
        console.log("🔍 [CreatorProfile] Fetching stats for creator:", creator.uid)

        // You can implement API calls here to fetch actual stats
        // For now, using placeholder data
        setStats({
          freeContentCount: 0,
          premiumContentCount: 0,
          totalViews: 0,
          followers: 0,
        })
      } catch (error) {
        console.error("❌ [CreatorProfile] Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    if (creator.uid) {
      fetchStats()
    }
  }, [creator.uid])

  const handleContentTypeDetection = (types: string[]) => {
    console.log("🔍 [CreatorProfile] Content types detected:", types)
    setContentTypes(types)
    // Reset to "all" when content types change
    if (!types.includes(selectedContentType) && selectedContentType !== "all") {
      setSelectedContentType("all")
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "2025"
    try {
      return new Date(dateString).getFullYear().toString()
    } catch {
      return "2025"
    }
  }

  const showDropdown = contentTypes.length > 1

  if (!creator) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Creator Not Found</h1>
          <p className="text-zinc-400">The creator profile you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Header */}
        <Card className="bg-zinc-900 border-zinc-800 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-red-500">
                <AvatarImage src={creator.profilePic || "/placeholder.svg"} alt={creator.displayName} />
                <AvatarFallback className="bg-zinc-800 text-white text-2xl font-bold">
                  {creator.displayName?.charAt(0)?.toUpperCase() || creator.username?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                  <div>
                    <h1 className="text-3xl font-bold">{creator.displayName || creator.username}</h1>
                    <p className="text-zinc-400">@{creator.username}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 bg-transparent">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Follow
                    </Button>
                    <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 bg-transparent">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>

                {creator.bio && <p className="text-zinc-300 mb-4 max-w-2xl">{creator.bio}</p>}

                {/* Stats */}
                <div className="flex flex-wrap gap-4 mb-4">
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                    <Calendar className="w-4 h-4 mr-2" />
                    Member since {formatDate(creator.createdAt)}
                  </Badge>

                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                    <Users className="w-4 h-4 mr-2" />
                    {stats.freeContentCount} free content
                  </Badge>

                  {stats.premiumContentCount > 0 && (
                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                      {stats.premiumContentCount} premium content
                    </Badge>
                  )}
                </div>

                {/* Social Links */}
                {creator.socialLinks && Object.keys(creator.socialLinks).length > 0 && (
                  <div className="flex gap-2">
                    {creator.socialLinks.instagram && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white"
                        onClick={() => window.open(creator.socialLinks!.instagram, "_blank")}
                      >
                        <Instagram className="w-4 h-4 mr-1" />
                        Instagram
                      </Button>
                    )}
                    {creator.socialLinks.twitter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white"
                        onClick={() => window.open(creator.socialLinks!.twitter, "_blank")}
                      >
                        <Twitter className="w-4 h-4 mr-1" />
                        Twitter
                      </Button>
                    )}
                    {creator.socialLinks.youtube && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white"
                        onClick={() => window.open(creator.socialLinks!.youtube, "_blank")}
                      >
                        <Youtube className="w-4 h-4 mr-1" />
                        YouTube
                      </Button>
                    )}
                    {creator.socialLinks.website && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white"
                        onClick={() => window.open(creator.socialLinks!.website, "_blank")}
                      >
                        <Globe className="w-4 h-4 mr-1" />
                        Website
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs with Filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Content Type Filter - Show to the left of tabs */}
              {showDropdown && (
                <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                  <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-700">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="all">All types</SelectItem>
                    {contentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Tabs */}
              <div className="flex border-b border-zinc-800">
                <button
                  onClick={() => setActiveTab("free")}
                  className={`px-4 py-2 font-medium transition-colors relative ${
                    activeTab === "free" ? "text-red-500 border-b-2 border-red-500" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Free Content
                </button>
                <button
                  onClick={() => setActiveTab("premium")}
                  className={`px-4 py-2 font-medium transition-colors relative ${
                    activeTab === "premium"
                      ? "text-red-500 border-b-2 border-red-500"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Premium Content
                </button>
              </div>
            </div>
          </div>

          {/* Content Display */}
          <FilteredContentDisplay
            creatorId={creator.uid}
            contentType={activeTab}
            selectedType={selectedContentType}
            onContentTypeDetection={handleContentTypeDetection}
          />
        </div>
      </div>
    </div>
  )
}
