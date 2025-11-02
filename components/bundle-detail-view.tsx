"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Package, Play, ImageIcon, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UnlockButton } from "@/components/unlock-button"
import { useAuth } from "@/hooks/use-auth"

interface BundleDetailViewProps {
  bundle: {
    id: string
    title: string
    description: string
    price: number
    thumbnailUrl: string
    contentCount: number
    stripePriceId: string
    stripeProductId: string
    createdAt: string
    detailedContentItems: any[]
  }
  creator: {
    uid: string
    username: string
    displayName: string
    profilePic: string
    bio: string
  }
}

export default function BundleDetailView({ bundle, creator }: BundleDetailViewProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [imageError, setImageError] = useState(false)

  const getContentIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Play className="w-4 h-4" />
      case "audio":
        return <Music className="w-4 h-4" />
      case "image":
        return <ImageIcon className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }

  const actualContentCount = bundle.detailedContentItems?.length || bundle.contentCount || 0

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/creator/${creator.username}`)}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {creator.displayName}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Image */}
          <div className="space-y-4">
            <div className="aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
              {bundle.thumbnailUrl && !imageError ? (
                <img
                  src={bundle.thumbnailUrl || "/placeholder.svg"}
                  alt={bundle.title}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-zinc-700" />
                </div>
              )}
            </div>

            {/* Creator Info */}
            <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              {creator.profilePic ? (
                <img
                  src={creator.profilePic || "/placeholder.svg"}
                  alt={creator.displayName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                  <span className="text-lg font-semibold">{creator.displayName[0]?.toUpperCase()}</span>
                </div>
              )}
              <div>
                <p className="font-semibold">{creator.displayName}</p>
                <p className="text-sm text-zinc-400">@{creator.username}</p>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{bundle.title}</h1>
              <div className="flex items-center gap-2 text-zinc-400">
                <Package className="w-4 h-4" />
                <span>{actualContentCount} items included</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-light">${bundle.price.toFixed(2)}</span>
            </div>

            {/* Purchase Button */}
            <UnlockButton
              stripePriceId={bundle.stripePriceId}
              bundleId={bundle.id}
              user={user}
              creatorId={creator.uid}
              price={bundle.price}
              title={bundle.title}
              variant="default"
              className="w-full h-12 text-lg font-semibold bg-white text-black hover:bg-zinc-200"
            />

            {/* Description */}
            {bundle.description && (
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">About this bundle</h2>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{bundle.description}</p>
              </div>
            )}

            {/* What's Included */}
            {bundle.detailedContentItems && bundle.detailedContentItems.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">What's included</h2>
                <div className="space-y-2">
                  {bundle.detailedContentItems.slice(0, 5).map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800"
                    >
                      <div className="text-zinc-400">{getContentIcon(item.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title || `Item ${index + 1}`}</p>
                        {item.duration && <p className="text-xs text-zinc-500">{item.duration}</p>}
                      </div>
                    </div>
                  ))}
                  {bundle.detailedContentItems.length > 5 && (
                    <p className="text-sm text-zinc-400 text-center py-2">
                      + {bundle.detailedContentItems.length - 5} more items
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
