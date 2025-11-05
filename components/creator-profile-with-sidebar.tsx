"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Instagram, Twitter, Youtube, Globe, RefreshCw, Share } from "lucide-react"
import { CreatorUploadCard } from "@/components/creator-upload-card"

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

interface CreatorProfileWithSidebarProps {
  creator: CreatorData
}

interface ContentItem {
  id: string
  title: string
  fileUrl?: string
  videoUrl?: string
  thumbnailUrl?: string
  type?: string
  views?: number
  downloads?: number
  createdAt?: string
}

export default function CreatorProfileWithSidebar({ creator }: CreatorProfileWithSidebarProps) {
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const [freeContent, setFreeContent] = useState<ContentItem[]>([])
  const [premiumContent, setPremiumContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContent = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 Fetching content for creator: ${creator.uid}`)

      // Fetch free content
      const freeResponse = await fetch(`/api/creator/${creator.uid}/free-content`)
      if (freeResponse.ok) {
        const freeData = await freeResponse.json()
        setFreeContent(freeData.freeContent || [])
        console.log(`✅ Loaded ${freeData.freeContent?.length || 0} free content items`)
      } else {
        console.warn("Failed to fetch free content:", freeResponse.status)
        setFreeContent([])
      }

      // Fetch premium content (product boxes)
      const premiumResponse = await fetch(`/api/creator/${creator.uid}/product-boxes`)
      if (premiumResponse.ok) {
        const premiumData = await premiumResponse.json()
        setPremiumContent(premiumData.productBoxes || [])
        console.log(`✅ Loaded ${premiumData.productBoxes?.length || 0} premium content items`)
      } else {
        console.warn("Failed to fetch premium content:", premiumResponse.status)
        setPremiumContent([])
      }
    } catch (error) {
      console.error("❌ Error fetching content:", error)
      setError("Failed to load content")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (creator.uid) {
      fetchContent()
    }
  }, [creator.uid])

  const formatMemberSince = (dateString?: string) => {
    if (!dateString) return "2025"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    } catch {
      return "2025"
    }
  }

  const currentContent = activeTab === "free" ? freeContent : premiumContent
  const freeContentCount = freeContent.length
  const premiumContentCount = premiumContent.length

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
          {/* Profile Picture */}
          <Avatar className="w-32 h-32 border-4 border-red-500">
            <AvatarImage src={creator.profilePic || "/placeholder.svg"} alt={creator.displayName} />
            <AvatarFallback className="bg-zinc-800 text-white text-4xl font-bold">
              {creator.displayName?.charAt(0)?.toUpperCase() || creator.username?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            {/* Name and Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold mb-1">{creator.displayName || creator.username}</h1>
                <p className="text-zinc-400 text-lg">@{creator.username}</p>
              </div>

              <div className="flex gap-2 mt-4 md:mt-0">
                <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 bg-transparent">
                  <Users className="w-4 h-4 mr-2" />
                  Follow
                </Button>
                <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 bg-transparent">
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
                  onClick={fetchContent}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Bio */}
            {creator.bio && <p className="text-zinc-300 mb-6 text-lg max-w-2xl">{creator.bio}</p>}

            {/* Stats Cards */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="bg-zinc-900 rounded-lg px-4 py-3 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-zinc-400" />
                <div>
                  <div className="text-sm text-zinc-400">Member since</div>
                  <div className="font-semibold">{formatMemberSince(creator.createdAt)}</div>
                </div>
              </div>

              <div className="bg-zinc-900 rounded-lg px-4 py-3 flex items-center gap-3">
                <Users className="w-5 h-5 text-zinc-400" />
                <div>
                  <div className="text-sm text-zinc-400">Free content</div>
                  <div className="font-semibold">{freeContentCount}</div>
                </div>
              </div>

              {premiumContentCount > 0 && (
                <div className="bg-zinc-900 rounded-lg px-4 py-3 flex items-center gap-3">
                  <Users className="w-5 h-5 text-zinc-400" />
                  <div>
                    <div className="text-sm text-zinc-400">Premium content</div>
                    <div className="font-semibold">{premiumContentCount}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Social Links */}
            {creator.socialLinks && Object.keys(creator.socialLinks).length > 0 && (
              <div className="flex gap-2">
                {creator.socialLinks.instagram && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
                    onClick={() => window.open(creator.socialLinks!.instagram, "_blank")}
                  >
                    <Instagram className="w-4 h-4 mr-2" />
                    Instagram
                  </Button>
                )}
                {creator.socialLinks.twitter && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
                    onClick={() => window.open(creator.socialLinks!.twitter, "_blank")}
                  >
                    <Twitter className="w-4 h-4 mr-2" />
                    Twitter
                  </Button>
                )}
                {creator.socialLinks.youtube && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
                    onClick={() => window.open(creator.socialLinks!.youtube, "_blank")}
                  >
                    <Youtube className="w-4 h-4 mr-2" />
                    YouTube
                  </Button>
                )}
                {creator.socialLinks.website && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
                    onClick={() => window.open(creator.socialLinks!.website, "_blank")}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Website
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <div className="mb-8">
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setActiveTab("free")}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === "free" ? "text-red-500 border-b-2 border-red-500" : "text-zinc-400 hover:text-white"
              }`}
            >
              Free Content
              {freeContentCount > 0 && (
                <Badge className="ml-2 bg-zinc-700 text-white text-xs">{freeContentCount}</Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab("premium")}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === "premium" ? "text-red-500 border-b-2 border-red-500" : "text-zinc-400 hover:text-white"
              }`}
            >
              Premium Content
              {premiumContentCount > 0 && (
                <Badge className="ml-2 bg-zinc-700 text-white text-xs">{premiumContentCount}</Badge>
              )}
            </button>
          </div>
        </div>

        {/* Content Display */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">⚠️ {error}</p>
              <Button
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
                onClick={fetchContent}
              >
                Try Again
              </Button>
            </div>
          ) : currentContent.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-400 mb-2">
                {activeTab === "free" ? "📹 No free content available" : "🔒 No premium content available"}
              </p>
              <p className="text-zinc-500 text-sm">
                {activeTab === "free"
                  ? "This creator hasn't uploaded any free content yet."
                  : "This creator hasn't created any premium content yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {currentContent.map((item) => (
                <CreatorUploadCard
                  key={item.id}
                  video={{
                    id: item.id,
                    title: item.title,
                    fileUrl: item.fileUrl || item.videoUrl || "",
                    thumbnailUrl: item.thumbnailUrl || "",
                    creatorName: creator.displayName || creator.username,
                    uid: creator.uid,
                    views: item.views || 0,
                    downloads: item.downloads || 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
