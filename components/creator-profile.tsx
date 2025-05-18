"use client"

import { useState } from "react"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { ClipGrid } from "@/components/clip-grid"
import { Button } from "@/components/ui/button"
import { Share2, Edit, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { VimeoVideo } from "@/lib/types"

interface CreatorProfileProps {
  creator: {
    id: string
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
  const { user } = useAuth()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const isOwner = user && user.uid === creator.uid

  const handleCopyLink = () => {
    const url = `${window.location.origin}/creator/${creator.username}`
    navigator.clipboard.writeText(url)
    setCopied(true)

    toast({
      title: "Link Copied",
      description: "Profile link copied to clipboard",
    })

    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-start gap-8 mb-12">
        {/* Profile image */}
        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
          {creator.profilePic ? (
            <Image
              src={creator.profilePic || "/placeholder.svg"}
              alt={creator.displayName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">
              {creator.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Profile info */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <h1 className="text-3xl font-bold text-white">{creator.displayName}</h1>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-gray-700 bg-gray-900/50 hover:bg-gray-800"
                onClick={handleCopyLink}
              >
                {copied ? <Copy className="h-3.5 w-3.5 mr-1" /> : <Share2 className="h-3.5 w-3.5 mr-1" />}
                {copied ? "Copied!" : "Share"}
              </Button>

              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-gray-700 bg-gray-900/50 hover:bg-gray-800"
                  onClick={() => (window.location.href = "/dashboard/profile")}
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-4">@{creator.username}</p>

          {creator.bio && <p className="text-gray-300 max-w-3xl">{creator.bio}</p>}
        </div>
      </div>

      {/* Clips grid */}
      <ClipGrid freeClips={creator.freeClips} paidClips={creator.paidClips} creatorId={creator.uid} isOwner={isOwner} />
    </div>
  )
}
