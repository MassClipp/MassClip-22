"use client"

import { useState } from "react"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { Share2, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import VimeoCard from "@/components/vimeo-card"
import type { VimeoVideo } from "@/lib/types"

interface CreatorProfileProps {
  creator: {
    uid: string
    username: string
    displayName: string
    bio: string
    profilePic: string
    freeClips: VimeoVideo[]
    paidClips: VimeoVideo[]
  }
}

export function CreatorProfile({ creator }: CreatorProfileProps) {
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const { user } = useAuth()
  const { toast } = useToast()

  const isOwner = user?.uid === creator.uid

  const handleShare = async () => {
    const url = `${window.location.origin}/creator/${creator.username}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${creator.displayName} on MassClip`,
          text: `Check out ${creator.displayName}'s content on MassClip`,
          url,
        })
      } catch (error) {
        console.error("Error sharing:", error)
        copyToClipboard(url)
      }
    } else {
      copyToClipboard(url)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Link Copied",
      description: "Profile link copied to clipboard",
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-10">
        {/* Profile Picture */}
        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
          {creator.profilePic ? (
            <Image
              src={creator.profilePic || "/placeholder.svg"}
              alt={creator.displayName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-2xl">
              {creator.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{creator.displayName}</h1>
          <p className="text-zinc-400 text-sm mb-4">@{creator.username}</p>

          {creator.bio && <p className="text-zinc-300 mb-4 max-w-2xl">{creator.bio}</p>}

          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm text-zinc-200 transition-colors"
            >
              <Share2 size={16} />
              <span>Share</span>
            </button>

            {isOwner && (
              <a
                href="/dashboard/profile"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm text-zinc-200 transition-colors"
              >
                <span>Edit Profile</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="mb-8">
        <div className="flex border-b border-zinc-800">
          <button
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === "free" ? "text-white border-b-2 border-crimson" : "text-zinc-400 hover:text-zinc-200"
            }`}
            onClick={() => setActiveTab("free")}
          >
            Free Clips
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === "premium" ? "text-white border-b-2 border-crimson" : "text-zinc-400 hover:text-zinc-200"
            }`}
            onClick={() => setActiveTab("premium")}
          >
            Premium Clips
          </button>
        </div>
      </div>

      {/* Content Display */}
      <div>
        {activeTab === "free" && (
          <>
            {creator.freeClips.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {creator.freeClips.map((clip) => (
                  <VimeoCard key={clip.uri} video={clip} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-zinc-400">No free clips available yet.</p>
              </div>
            )}
          </>
        )}

        {activeTab === "premium" && (
          <>
            {creator.paidClips.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {creator.paidClips.map((clip) => (
                  <div key={clip.uri} className="relative">
                    <div className="opacity-50">
                      <VimeoCard video={clip} />
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
                      <Lock className="w-8 h-8 text-crimson mb-2" />
                      <button className="px-4 py-2 bg-crimson hover:bg-crimson/90 text-white text-sm font-medium rounded-md transition-colors">
                        Unlock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-zinc-400">No premium clips available yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
