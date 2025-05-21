"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Share2, Edit, Plus, Instagram, Twitter, Globe, Calendar, Film, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  freeClips: any[]
  paidClips: any[]
  createdAt: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    website?: string
  }
}

export default function CreatorProfile({ creator }: { creator: Creator }) {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const isOwner = user && user.uid === creator.uid
  const router = useRouter()

  // Set active tab based on URL query parameter
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "premium") {
      setActiveTab("premium")
    } else {
      setActiveTab("free")
    }
  }, [searchParams])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${creator.displayName} on MassClip`,
          text: `Check out ${creator.displayName}'s content on MassClip`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
      alert("Profile link copied to clipboard!")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const handleAddClip = () => {
    router.push("/dashboard/upload")
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section with Gradient Background */}
      <div className="relative">
        {/* Background gradient with subtle pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>

        <div className="container mx-auto relative z-10">
          {/* Profile Header */}
          <div className="pt-10 pb-8 px-4 md:px-8 lg:px-0">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Profile Image with Gradient Border */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-red-500 to-amber-500 rounded-full opacity-75 blur-sm group-hover:opacity-100 transition duration-300"></div>
                <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800">
                  {creator.profilePic ? (
                    <Image
                      src={creator.profilePic || "/placeholder.svg"}
                      alt={creator.displayName}
                      width={144}
                      height={144}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-400 text-4xl font-light">
                      {creator.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Premium indicator */}
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-600 text-black text-xs font-bold px-2.5 py-0.5 rounded-full shadow-lg">
                  PRO
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-semibold text-white mb-1 tracking-tight">
                  {creator.displayName}
                </h1>
                <p className="text-zinc-400 text-sm mb-4">@{creator.username}</p>

                {creator.bio && (
                  <div className="relative max-w-2xl mb-6 text-sm bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50 backdrop-blur-sm">
                    <p className="text-zinc-300">{creator.bio}</p>
                  </div>
                )}

                {/* Stats Cards Row */}
                <div className="grid grid-cols-3 gap-3 max-w-md mb-6">
                  <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center">
                    <Calendar className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                    <p className="text-xs text-zinc-400">Member since</p>
                    <p className="text-sm font-medium text-white">{formatDate(creator.createdAt)}</p>
                  </div>
                  <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center">
                    <Film className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                    <p className="text-xs text-zinc-400">Free clips</p>
                    <p className="text-sm font-medium text-white">{creator.freeClips?.length || 0}</p>
                  </div>
                  <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center">
                    <Lock className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                    <p className="text-xs text-zinc-400">Premium clips</p>
                    <p className="text-sm font-medium text-white">{creator.paidClips?.length || 0}</p>
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
                  {creator.socialLinks?.instagram && (
                    <a
                      href={`https://instagram.com/${creator.socialLinks.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs bg-zinc-900/80 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors border border-zinc-800/50"
                    >
                      <Instagram className="h-3.5 w-3.5" />
                      <span>Instagram</span>
                    </a>
                  )}

                  {creator.socialLinks?.twitter && (
                    <a
                      href={`https://twitter.com/${creator.socialLinks.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs bg-zinc-900/80 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors border border-zinc-800/50"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      <span>Twitter</span>
                    </a>
                  )}

                  {creator.socialLinks?.website && (
                    <a
                      href={creator.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs bg-zinc-900/80 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors border border-zinc-800/50"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>Website</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 md:mt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 hover:bg-zinc-800 text-white"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>

                {isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 hover:bg-zinc-800 text-white"
                    onClick={() => router.push("/dashboard/profile/edit")}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs with Gradient Highlight */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 pb-20">
        {/* Tab Navigation */}
        <div className="border-b border-zinc-800/50 mb-8">
          <div className="flex">
            <button
              className={cn(
                "px-6 py-3 text-sm font-medium relative transition-all duration-200",
                activeTab === "free" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
              onClick={() => setActiveTab("free")}
            >
              Free Clips
              {activeTab === "free" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-600"></div>
              )}
            </button>

            <button
              className={cn(
                "px-6 py-3 text-sm font-medium relative transition-all duration-200",
                activeTab === "premium" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
              onClick={() => setActiveTab("premium")}
            >
              Premium Clips
              {activeTab === "premium" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-600"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="mt-8">
          {activeTab === "free" && (
            <div>
              {creator.freeClips && creator.freeClips.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {/* Free clips would be rendered here */}
                  <div className="text-zinc-400">Free clips would be displayed here</div>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="max-w-md mx-auto bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                      <Film className="h-8 w-8 text-zinc-600" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">No Free Clips Yet</h3>
                    <p className="text-zinc-400 mb-6">
                      {isOwner
                        ? "Share your first free clip to attract viewers and showcase your content."
                        : `${creator.displayName} hasn't shared any free clips yet.`}
                    </p>

                    {isOwner && (
                      <Button
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
                        onClick={handleAddClip}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Clip
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "premium" && (
            <div>
              {creator.paidClips && creator.paidClips.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {/* Premium clips would be rendered here */}
                  <div className="text-zinc-400">Premium clips would be displayed here</div>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="max-w-md mx-auto bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                      <Lock className="h-8 w-8 text-zinc-600" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">No Premium Clips Yet</h3>
                    <p className="text-zinc-400 mb-6">
                      {isOwner
                        ? "Add premium clips to monetize your content and provide exclusive value to your subscribers."
                        : `${creator.displayName} hasn't shared any premium clips yet.`}
                    </p>

                    {isOwner && (
                      <Button
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
                        onClick={() => router.push("/dashboard/upload?premium=true")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Premium Clip
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
