"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Package } from "lucide-react"
import { UnlockButton } from "@/components/unlock-button"

interface ContentItem {
  id: string
  title: string
  thumbnailUrl: string
  fileUrl: string
  duration: string
  views: number
  type: "video" | "audio" | "image" | "bundle" | "ebook"
  isPremium: boolean
  price?: number
  contentCount?: number
  description?: string
  stripePriceId?: string
  stripeProductId?: string
  content?: any[]
  pageCount?: number
  coverUrl?: string
}

interface BundleCardProps {
  item: ContentItem
  user: any
  creatorId: string
  creatorUsername?: string
  isPreview?: boolean
}

export default function BundleCard({ item, user, creatorId, creatorUsername, isPreview = false }: BundleCardProps) {
  const router = useRouter()
  const [isThumbnailHovered, setIsThumbnailHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isEbook = item.type === "ebook" || item.pageCount !== undefined

  console.log("🎯 BundleCard rendering with item:", {
    id: item.id,
    title: item.title,
    type: item.type,
    isEbook,
    thumbnailUrl: item.thumbnailUrl,
    stripePriceId: item.stripePriceId,
    stripeProductId: item.stripeProductId,
    price: item.price,
    contentCount: item.contentCount,
    pageCount: item.pageCount,
    creatorId,
    creatorUsername,
    currentUserId: user?.uid,
    isPreview,
  })

  const handleImageError = () => {
    console.log("❌ Image failed to load:", item.thumbnailUrl)
    setImageError(true)
  }

  const handleImageLoad = () => {
    console.log("✅ Image loaded successfully:", item.thumbnailUrl)
    setImageError(false)
  }

  const formatPrice = (price: number | undefined | null): string => {
    console.log("🔢 Formatting price:", price, typeof price)
    if (typeof price === "number" && !isNaN(price) && isFinite(price)) {
      return price.toFixed(2)
    }
    return "0.00"
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) {
      return
    }

    if (isPreview && creatorUsername) {
      router.push(`/creator/${creatorUsername}/${isEbook ? "ebook" : "bundle"}/${item.id}`)
    } else if (creatorUsername) {
      router.push(`/creator/${creatorUsername}/${isEbook ? "ebook" : "bundle"}/${item.id}`)
    }
  }

  const formattedPrice = formatPrice(item.price)
  console.log("💰 Final formatted price:", formattedPrice)

  const displayImage = isEbook ? item.coverUrl || item.thumbnailUrl : item.thumbnailUrl

  return (
    <div
      onClick={handleCardClick}
      className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700/30 hover:border-zinc-600/40 transition-all duration-300 w-full max-w-[340px] sm:max-w-[320px] relative cursor-pointer group"
    >
      <div
        className={`relative ${isEbook ? "aspect-[3/4]" : "aspect-square"} bg-zinc-800 overflow-hidden`}
        onMouseEnter={() => setIsThumbnailHovered(true)}
        onMouseLeave={() => setIsThumbnailHovered(false)}
      >
        {displayImage && !imageError ? (
          <img
            src={displayImage || "/placeholder.svg"}
            alt={item.title}
            className={`w-full h-full object-cover transition-transform duration-500 ${isThumbnailHovered ? "scale-110" : "scale-100"}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-600" />
          </div>
        )}

        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/90 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-full">
          <span className="text-xs sm:text-sm text-white font-medium">
            {isEbook
              ? `${item.pageCount || 0} ${item.pageCount === 1 ? "page" : "pages"}`
              : `${item.contentCount || 0} items`}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3 bg-gradient-to-br from-black via-black to-zinc-800/30 relative">
        <div className="space-y-2">
          <h3 className="text-white text-lg sm:text-xl font-semibold line-clamp-2 leading-tight" title={item.title}>
            {item.title}
          </h3>
          <p className="text-zinc-400 text-sm sm:text-base line-clamp-2 leading-relaxed">
            {item.description || (isEbook ? "Digital eBook" : "Premium content bundle")}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-white text-2xl sm:text-3xl font-light tracking-tight">${formattedPrice}</span>
          </div>

          {isPreview ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (creatorUsername) {
                  router.push(`/creator/${creatorUsername}/${isEbook ? "ebook" : "bundle"}/${item.id}`)
                }
              }}
              className="w-full border border-white/20 text-white hover:bg-white/5 rounded-md font-medium text-sm px-4 py-2.5 transition-colors"
            >
              View Details
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (creatorUsername) {
                    router.push(`/creator/${creatorUsername}/${isEbook ? "ebook" : "bundle"}/${item.id}`)
                  }
                }}
                className="flex-1 border border-white/20 text-white hover:bg-white/5 rounded-md font-medium text-sm px-4 py-2.5 transition-colors"
              >
                See Details
              </button>

              <UnlockButton
                stripePriceId={item.stripePriceId}
                {...(isEbook ? { ebookId: item.id } : { bundleId: item.id })}
                user={user}
                creatorId={creatorId}
                price={item.price || 0}
                title={item.title}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/5 rounded-md font-medium text-sm px-4 py-2.5"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
