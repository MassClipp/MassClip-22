"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Grid3X3, RefreshCw, Share, Instagram } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Play, ImageIcon, FileText } from "lucide-react"
import FilteredContentDisplay from "./filtered-content-display"

interface CreatorProfileProps {
  creator: {
    id: string
    username: string
    displayName?: string
    bio?: string
    profilePic?: string
    instagramHandle?: string
    xHandle?: string
    tiktokHandle?: string
    memberSince?: string
    freeContentCount?: number
    premiumContentCount?: number
  }
  onRefresh?: () => void
}

export default function CreatorProfile({ creator: initialCreator, onRefresh }: CreatorProfileProps) {
  const [creator, setCreator] = useState(initialCreator)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)
  const [selectedContentType, setSelectedContentType] = useState<"all" | "videos" | "images" | "files">("all")
  const [contentTypes, setContentTypes] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const [freeContent, setFreeContent] = useState<any[]>([])
  const [premiumContent, setPremiumContent] = useState<any[]>([])

  // Load profile picture on mount and when creator changes
  useEffect(() => {
    const loadProfilePic = async () => {
      if (!creator?.id) return

      try {
        // First check the creators collection
        const creatorDoc = await getDoc(doc(db, "creators", creator.id))
        if (creatorDoc.exists()) {
          const creatorData = creatorDoc.data()
          if (creatorData.profilePic) {
            const url = creatorData.profilePic.includes("?")
              ? `${creatorData.profilePic}&t=${Date.now()}`
              : `${creatorData.profilePic}?t=${Date.now()}`
            setProfilePicUrl(url)
            return
          }
        }

        // Fallback to users collection
        const userDoc = await getDoc(doc(db, "users", creator.id))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.profilePic) {
            const url = userData.profilePic.includes("?")
              ? `${userData.profilePic}&t=${Date.now()}`
              : `${userData.profilePic}?t=${Date.now()}`
            setProfilePicUrl(url)
          }
        }
      } catch (error) {
        console.error("Error loading profile picture:", error)
      }
    }

    loadProfilePic()
  }, [creator?.id])

  const handleRefresh = async () => {
    if (!creator?.id) return

    setIsRefreshing(true)
    try {
      // Fetch fresh creator data
      const creatorDoc = await getDoc(doc(db, "creators", creator.id))
      if (creatorDoc.exists()) {
        const freshData = creatorDoc.data()
        setCreator((prev) => ({
          ...prev,
          ...freshData,
          id: creator.id,
        }))

        // Update profile picture with cache busting
        if (freshData.profilePic) {
          const url = freshData.profilePic.includes("?")
            ? `${freshData.profilePic}&t=${Date.now()}`
            : `${freshData.profilePic}?t=${Date.now()}`
          setProfilePicUrl(url)
        }
      }

      // Call parent refresh if provided
      if (onRefresh) {
        await onRefresh()
      }

      toast.success("Profile refreshed successfully")
    } catch (error) {
      console.error("Error refreshing profile:", error)
      toast.error("Failed to refresh profile")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/creator/${creator.username}`
      await navigator.share({
        title: `${creator.displayName || creator.username}'s Profile`,
        text: creator.bio || `Check out ${creator.displayName || creator.username}'s content`,
        url: url,
      })
    } catch (error) {
      // Fallback to clipboard
      const url = `${window.location.origin}/creator/${creator.username}`
      await navigator.clipboard.writeText(url)
      toast.success("Profile link copied to clipboard")
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatMemberSince = (dateString?: string) => {
    if (!dateString) return "Recently"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    } catch {
      return "Recently"
    }
  }

  const getContentTypes = (content: any[]) => {
    const types = new Set<string>()
    content?.forEach((item) => {
      if (item.type === "video" || item.videoUrl || item.vimeoId) {
        types.add("videos")
      } else if (item.type === "image" || item.thumbnailUrl) {
        types.add("images")
      } else if (item.type === "file" || item.fileUrl) {
        types.add("files")
      }
    })
    return Array.from(types)
  }

  const handleContentTypeDetection = (types: string[]) => {
    setContentTypes(types)
  }

  useEffect(() => {
    const loadCreatorContent = async () => {
      if (!creator?.id) return

      try {
        // Load free content
        const freeResponse = await fetch(`/api/creator/${creator.id}/free-content`)
        if (freeResponse.ok) {
          const freeData = await freeResponse.json()
          setFreeContent(freeData.content || [])
        }

        // Load premium content if available
        if (creator.premiumContentCount && creator.premiumContentCount > 0) {
          const premiumResponse = await fetch(`/api/creator/${creator.id}/product-boxes`)
          if (premiumResponse.ok) {
            const premiumData = await premiumResponse.json()
            setPremiumContent(premiumData.productBoxes || [])
          }
        }
      } catch (error) {
        console.error("Error loading creator content:", error)
      }
    }

    loadCreatorContent()
  }, [creator?.id, creator.premiumContentCount])

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Profile Section */}
        <div className="flex-shrink-0">
          <div className="flex flex-col items-center lg:items-start space-y-4">
            <Avatar className="w-32 h-32 border-4 border-orange-500">
              <AvatarImage
                src={profilePicUrl || creator.profilePic || ""}
                alt={creator.displayName || creator.username}
                className="object-cover"
              />
              <AvatarFallback className="text-2xl font-bold bg-gray-800 text-white">
                {getInitials(creator.displayName || creator.username)}
              </AvatarFallback>
            </Avatar>

            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold text-white">{creator.displayName || creator.username}</h1>
              <p className="text-gray-400">@{creator.username}</p>
            </div>

            {creator.bio && <p className="text-gray-300 max-w-md text-center lg:text-left">{creator.bio}</p>}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-transparent"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-transparent"
              >
                <Share className="w-4 h-4" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Stats and Info Section */}
        <div className="flex-1 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <CalendarDays className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Member since</p>
                <p className="text-white font-semibold">{formatMemberSince(creator.memberSince)}</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <Grid3X3 className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Free content</p>
                <p className="text-white font-semibold">{creator.freeContentCount || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Content Type Filter and Tabs */}
          <div className="flex items-center gap-4 mb-6">
            {/* Content Type Dropdown - only show if multiple types exist */}
            {contentTypes.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                    {selectedContentType === "videos" && <Play className="w-4 h-4" />}
                    {selectedContentType === "images" && <ImageIcon className="w-4 h-4" />}
                    {selectedContentType === "files" && <FileText className="w-4 h-4" />}
                    {selectedContentType === "all" && <Grid3X3 className="w-4 h-4" />}
                    <span className="capitalize">
                      {selectedContentType === "all" ? "All Content" : selectedContentType}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setSelectedContentType("all")}>
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    All Content
                  </DropdownMenuItem>
                  {contentTypes.includes("videos") && (
                    <DropdownMenuItem onClick={() => setSelectedContentType("videos")}>
                      <Play className="w-4 h-4 mr-2" />
                      Videos
                    </DropdownMenuItem>
                  )}
                  {contentTypes.includes("images") && (
                    <DropdownMenuItem onClick={() => setSelectedContentType("images")}>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Images
                    </DropdownMenuItem>
                  )}
                  {contentTypes.includes("files") && (
                    <DropdownMenuItem onClick={() => setSelectedContentType("files")}>
                      <FileText className="w-4 h-4 mr-2" />
                      Files
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Existing Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === "free"
                    ? "text-orange-500 border-b-2 border-orange-500"
                    : "text-gray-400 hover:text-white"
                }`}
                onClick={() => setActiveTab("free")}
              >
                Free Content
              </button>
              {(creator.premiumContentCount || 0) > 0 && (
                <button
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === "premium"
                      ? "text-orange-500 border-b-2 border-orange-500"
                      : "text-gray-400 hover:text-white"
                  }`}
                  onClick={() => setActiveTab("premium")}
                >
                  Premium Content
                </button>
              )}
            </div>
          </div>

          {/* Content Display */}
          <div className="mt-8">
            {activeTab === "free" && (
              <FilteredContentDisplay
                content={freeContent}
                selectedType={selectedContentType}
                onContentTypeDetection={handleContentTypeDetection}
              />
            )}

            {activeTab === "premium" && (
              <FilteredContentDisplay
                content={premiumContent}
                selectedType={selectedContentType}
                onContentTypeDetection={handleContentTypeDetection}
              />
            )}
          </div>

          {/* Social Links */}
          {(creator.xHandle || creator.instagramHandle || creator.tiktokHandle) && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-white font-semibold mb-3">Social Links</h3>

                {creator.xHandle && (
                  <a
                    href={`https://x.com/${creator.xHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>@{creator.xHandle}</span>
                  </a>
                )}

                {creator.instagramHandle && (
                  <a
                    href={`https://instagram.com/${creator.instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                    <span>@{creator.instagramHandle}</span>
                  </a>
                )}

                {creator.tiktokHandle && (
                  <a
                    href={`https://tiktok.com/@${creator.tiktokHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                    <span>@{creator.tiktokHandle}</span>
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Premium Content Badge */}
          {(creator.premiumContentCount || 0) > 0 && (
            <div className="flex justify-center lg:justify-start">
              <Badge variant="secondary" className="bg-orange-500 text-white">
                {creator.premiumContentCount} Premium Content Available
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
