"use client"

import { useState } from "react"
import { Package } from "lucide-react"
import { UnlockButton } from "@/components/unlock-button"

interface ContentItem {
  id: string
  title: string
  thumbnailUrl: string
  fileUrl: string
  duration: string
  views: number
  type: "video" | "audio" | "image" | "bundle"
  isPremium: boolean
  price?: number
  contentCount?: number
  description?: string
  stripePriceId?: string
  stripeProductId?: string
  content?: any[]
}

interface BundleCardProps {
  item: ContentItem
  user: any
  creatorId: string
}

export default function BundleCard({ item, user, creatorId }: BundleCardProps) {
  const [isThumbnailHovered, setIsThumbnailHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  console.log("🎯 BundleCard rendering with item:", {
    id: item.id,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl,
    stripePriceId: item.stripePriceId,
    stripeProductId: item.stripeProductId,
    price: item.price,
    contentCount: item.contentCount,
    creatorId,
    currentUserId: user?.uid,
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

  const formattedPrice = formatPrice(item.price)
  console.log("💰 Final formatted price:", formattedPrice)

  return (
    <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700/30 hover:border-zinc-600/40 transition-all duration-300 w-full max-w-[340px] sm:max-w-[320px] relative">
      <div
        className="relative aspect-square bg-zinc-800 overflow-hidden"
        onMouseEnter={() => setIsThumbnailHovered(true)}
        onMouseLeave={() => setIsThumbnailHovered(false)}
      >
        {item.thumbnailUrl && !imageError ? (
          <img
            src={item.thumbnailUrl || "/placeholder.svg"}
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

        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/80 backdrop-blur-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs text-white font-semibold">
          {item.contentCount || 0} items
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-2 bg-gradient-to-br from-black via-black to-zinc-800/30 relative">
        <div className="space-y-1">
          <h3 className="text-white text-base sm:text-lg font-bold line-clamp-1" title={item.title}>
            {item.title}
          </h3>
          <p className="text-zinc-400 text-sm line-clamp-1">{item.description || "Premium content bundle"}</p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-white text-xl sm:text-2xl font-light">${formattedPrice}</span>

          <UnlockButton
            stripePriceId={item.stripePriceId}
            bundleId={item.id}
            user={user}
            creatorId={creatorId}
            price={item.price || 0}
            title={item.title}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5 rounded-md font-light text-sm px-4 py-2"
          />
        </div>
      </div>
    </div>
  )
}
