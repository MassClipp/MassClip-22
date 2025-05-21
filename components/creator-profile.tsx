"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Share2, Edit, Plus, Instagram, Twitter, Globe } from "lucide-react"
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
      {/* Header Section */}
      <div className="relative pt-8 pb-6 px-4 md:px-8">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-col items-center md:flex-row md:items-start gap-8">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 shadow-xl">
                {creator.profilePic ? (
                  <Image
                    src={creator.profilePic || "/placeholder.svg"}
                    alt={creator.displayName}
                    width={128}
                    height={128}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-400 text-4xl font-light">
                    {creator.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Premium indicator */}
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                PRO
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-medium text-white mb-1">{creator.displayName}</h1>
              <p className="text-zinc-400 text-sm mb-4">@{creator.username}</p>

              {creator.bio && <p className="text-zinc-300 max-w-2xl mb-6 text-sm">{creator.bio}</p>}

              {/* Stats Row */}
              <div className="flex flex-wrap gap-6 justify-center md:justify-start mb-4 text-sm">
                <div className="text-zinc-400">Member since {formatDate(creator.createdAt)}</div>
                <div className="text-zinc-400">
                  <span className="text-white font-medium">{creator.freeClips?.length || 0}</span> free clips
                </div>
                <div className="text-zinc-400">
                  <span className="text-white font-medium">{creator.paidClips?.length || 0}</span> premium clips
                </div>
              </div>

              {/* Social Links */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                {creator.socialLinks?.instagram && (
                  <a
                    href={`https://instagram.com/${creator.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors"
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
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors"
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
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors"
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
                className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>

              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white"
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

      {/* Content Tabs */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 pb-20">
        {/* Tab Navigation */}
        <div className="border-b border-zinc-800">
          <div className="flex">
            <button
              className={cn(
                "px-6 py-3 text-sm font-medium relative",
                activeTab === "free" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
              onClick={() => setActiveTab("free")}
            >
              Free Clips
              {activeTab === "free" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></div>}
            </button>

            <button
              className={cn(
                "px-6 py-3 text-sm font-medium relative",
                activeTab === "premium" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
              onClick={() => setActiveTab("premium")}
            >
              Premium Clips
              {activeTab === "premium" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></div>}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="mt-8">
          {activeTab === "free" && (
            <div>
              {creator.freeClips && creator.freeClips.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {/* Free clips would be rendered here */}
                  <div className="text-zinc-400">Free clips would be displayed here</div>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <h3 className="text-xl font-medium text-white mb-2">No Free Clips Yet</h3>
                  <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                    {isOwner
                      ? "Share your first free clip to attract viewers and showcase your content."
                      : `${creator.displayName} hasn't shared any free clips yet.`}
                  </p>

                  {isOwner && (
                    <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={handleAddClip}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Clip
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "premium" && (
            <div>
              {creator.paidClips && creator.paidClips.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {/* Premium clips would be rendered here */}
                  <div className="text-zinc-400">Premium clips would be displayed here</div>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <h3 className="text-xl font-medium text-white mb-2">No Premium Clips Yet</h3>
                  <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                    {isOwner
                      ? "Add premium clips to monetize your content and provide exclusive value to your subscribers."
                      : `${creator.displayName} hasn't shared any premium clips yet.`}
                  </p>

                  {isOwner && (
                    <Button
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => router.push("/dashboard/upload?premium=true")}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Premium Clip
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
