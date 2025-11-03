"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, ArrowLeft, BookOpen } from "lucide-react"
import { UnlockButton } from "@/components/unlock-button"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface EbookDetailViewProps {
  ebook: {
    id: string
    title: string
    description: string
    price: number
    coverUrl: string
    pageCount: number
    stripePriceId: string
    stripeProductId: string
    createdAt: string
    pages: Array<{ url: string; title?: string; pageNumber: number } | string>
  }
  creator: {
    uid: string
    username: string
    displayName: string
    profilePic: string
    bio: string
  }
}

export default function EbookDetailView({ ebook, creator }: EbookDetailViewProps) {
  const router = useRouter()
  const { user } = useFirebaseAuth()
  const [imageError, setImageError] = useState(false)

  const formatPrice = (price: number): string => {
    if (typeof price === "number" && !isNaN(price) && isFinite(price)) {
      return price.toFixed(2)
    }
    return "0.00"
  }

  const pageTitles = ebook.pages
    .map((page) => {
      if (typeof page === "string") return null
      return page.title
    })
    .filter((title): title is string => !!title && title.trim() !== "")

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-900/40 via-black to-zinc-800/30 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-t from-zinc-900/20 via-transparent to-zinc-800/10 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push(`/creator/${creator.username}`)}
          className="mb-6 text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {creator.displayName}'s Profile
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Cover Image */}
          <div className="space-y-6">
            <div className="relative aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
              {ebook.coverUrl && !imageError ? (
                <img
                  src={ebook.coverUrl || "/placeholder.svg"}
                  alt={ebook.title}
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
            <div className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <Avatar className="w-12 h-12 border-2 border-zinc-700">
                <AvatarImage src={creator.profilePic || "/placeholder.svg"} alt={creator.displayName} />
                <AvatarFallback className="bg-zinc-800 text-white">
                  {creator.displayName?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-medium">{creator.displayName}</p>
                <p className="text-zinc-400 text-sm">@{creator.username}</p>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{ebook.title}</h1>
              {ebook.description && <p className="text-zinc-400 text-lg leading-relaxed">{ebook.description}</p>}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 px-4 py-2">
                <BookOpen className="w-4 h-4 mr-2" />
                {ebook.pageCount} {ebook.pageCount === 1 ? "page" : "pages"}
              </Badge>
            </div>

            {/* Price and Purchase */}
            <div className="space-y-4 p-6 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">${formatPrice(ebook.price)}</span>
                <span className="text-zinc-500">USD</span>
              </div>

              <UnlockButton
                ebookId={ebook.id}
                price={ebook.price}
                title={ebook.title}
                stripePriceId={ebook.stripePriceId}
                user={user}
                creatorId={creator.uid}
                variant="default"
                className="w-full bg-white text-black hover:bg-zinc-100 font-medium text-lg py-6"
              />

              <p className="text-zinc-500 text-sm text-center">
                Instant access after purchase • Secure payment via Stripe
              </p>
            </div>

            {/* What's Included */}
            {pageTitles.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-white font-semibold text-lg">Chapters</h3>
                <ul className="space-y-2 text-zinc-400">
                  {pageTitles.map((title, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                      {title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
