"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Users, Instagram } from "lucide-react"
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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-start mb-8">
          {/* Left side - Profile Info */}
          <div className="flex flex-col items-start">
            {/* Profile Picture */}
            <Avatar className="w-32 h-32 border-4 border-orange-500 mb-4">
              <AvatarImage src={creator.profilePicture || "/placeholder.svg"} alt={creator.displayName} />
              <AvatarFallback className="bg-zinc-800 text-white text-2xl font-bold">
                {creator.displayName?.charAt(0)?.toUpperCase() || creator.username?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>

            {/* Name and Username */}
            <h1 className="text-2xl font-bold mb-1">{creator.displayName || creator.username}</h1>
            <p className="text-zinc-400 mb-3">@{creator.username}</p>

            {/* Bio */}
            {creator.bio && <p className="text-zinc-300 mb-4 max-w-sm">{creator.bio}</p>}

            {/* Stats Cards */}
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2 bg-zinc-900 px-4 py-3 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-500" />
                <div className="text-center">
                  <div className="text-xs text-zinc-400">Member since</div>
                  <div className="font-medium">{creator.memberSince || "June 2025"}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-zinc-900 px-4 py-3 rounded-lg">
                <Users className="w-5 h-5 text-orange-500" />
                <div className="text-center">
                  <div className="text-xs text-zinc-400">Free content</div>
                  <div className="font-medium">{creator.stats?.freeContentCount || 2}</div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            {creator.socialLinks?.instagram && (
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 hover:bg-zinc-800 bg-transparent text-zinc-400 hover:text-white mb-4"
                onClick={() => window.open(creator.socialLinks!.instagram, "_blank")}
              >
                <Instagram className="w-4 h-4 mr-2" />
                Instagram
              </Button>
            )}
          </div>

          {/* Right side - Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 bg-transparent">
              Refresh
            </Button>
            <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 bg-transparent">
              Share
            </Button>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="mb-6">
          <div className="flex border-b border-zinc-800 mb-6">
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
                activeTab === "premium" ? "text-red-500 border-b-2 border-red-500" : "text-zinc-400 hover:text-white"
              }`}
            >
              Premium Content
            </button>
          </div>

          {/* Content Display */}
          <FilteredContentDisplay
            creatorId={creator.uid}
            contentType={activeTab}
            selectedType="all"
            onContentTypeDetection={() => {}}
          />
        </div>
      </div>
    </div>
  )
}
