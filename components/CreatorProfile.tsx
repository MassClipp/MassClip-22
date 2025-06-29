"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Users, Instagram, Twitter, Youtube, Globe } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import FilteredContentDisplay from "@/components/filtered-content-display"

interface CreatorProfileProps {
  username: string
}

interface CreatorData {
  uid: string
  username: string
  displayName: string
  bio?: string
  profilePicture?: string
  memberSince?: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    youtube?: string
    website?: string
  }
  stats?: {
    freeContentCount: number
    premiumContentCount: number
    totalViews: number
    followers: number
  }
}

export default function CreatorProfile({ username }: CreatorProfileProps) {
  const [creator, setCreator] = useState<CreatorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const [contentTypes, setContentTypes] = useState<string[]>([])
  const [selectedContentType, setSelectedContentType] = useState("all")

  useEffect(() => {
    const fetchCreatorData = async () => {
      try {
        setLoading(true)
        console.log("🔍 [CreatorProfile] Fetching creator data for username:", username)

        const response = await fetch(`/api/creator/${username}`)

        if (!response.ok) {
          throw new Error("Creator not found")
        }

        const data = await response.json()
        console.log("✅ [CreatorProfile] Creator data:", data)
        setCreator(data.creator)
      } catch (error) {
        console.error("❌ [CreatorProfile] Error fetching creator:", error)
        setCreator(null)
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      fetchCreatorData()
    }
  }, [username])

  const handleContentTypeDetection = (types: string[]) => {
    console.log("🔍 [CreatorProfile] Content types detected:", types)
    setContentTypes(types)
    // Reset to "all" when content types change
    if (!types.includes(selectedContentType) && selectedContentType !== "all") {
      setSelectedContentType("all")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

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

  const showDropdown = contentTypes.length > 1 || true // Temporarily force show for testing

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-red-500">
            <AvatarImage src={creator.profilePicture || "/placeholder.svg"} alt={creator.displayName} />
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
                  <Users className="w-4 h-4 mr-2" />
                  Follow
                </Button>
                <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 bg-transparent">
                  Share
                </Button>
              </div>
            </div>

            {creator.bio && <p className="text-zinc-300 mb-4 max-w-2xl">{creator.bio}</p>}

            {/* Stats */}
            <div className="flex flex-wrap gap-6 mb-4">
              <div className="flex items-center gap-2 bg-zinc-900 px-3 py-2 rounded-lg">
                <Calendar className="w-4 h-4 text-zinc-400" />
                <span className="text-sm">
                  Member since <span className="font-medium">{creator.memberSince || "2025"}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 bg-zinc-900 px-3 py-2 rounded-lg">
                <Users className="w-4 h-4 text-zinc-400" />
                <span className="text-sm">
                  Free content <span className="font-medium">{creator.stats?.freeContentCount || 0}</span>
                </span>
              </div>
            </div>

            {/* Social Links */}
            {creator.socialLinks && (
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
