"use client"
import { useState } from "react"
import { BookOpen, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface EBookItem {
  id: string
  title: string
  description?: string
  coverUrl?: string
  thumbnailUrl?: string
  price?: number
  pageCount?: number
  isPremium: boolean
  stripePriceId?: string
  stripeProductId?: string
}

interface EBookCardProps {
  item: EBookItem
  username?: string | null
}

export function EBookCard({ item, username }: EBookCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  const handleClick = () => {
    if (username) {
      router.push(`/creator/${username}/ebooks/${item.id}`)
    }
  }

  return (
    <div
      className="group cursor-pointer w-full max-w-[180px] sm:max-w-[200px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div
        className={`relative aspect-[3/4] rounded-lg overflow-hidden mb-2 transition-all duration-300 bg-zinc-900 ${
          isHovered ? "border border-white/50" : "border border-zinc-800"
        }`}
      >
        {item.coverUrl || item.thumbnailUrl ? (
          <img src={item.coverUrl || item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
            <BookOpen className="h-12 w-12 text-zinc-600" />
          </div>
        )}

        {item.isPremium && (
          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
            <Lock className="h-3 w-3 text-yellow-400" />
            <span className="text-xs text-white font-medium">
              ${typeof item.price === "number" ? item.price.toFixed(2) : "0.00"}
            </span>
          </div>
        )}

        {item.pageCount && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
            {item.pageCount} pages
          </div>
        )}

        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <Button size="sm" className="bg-white text-black hover:bg-zinc-100">
            {item.isPremium ? "Purchase" : "Read"}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-white text-xs sm:text-sm font-medium line-clamp-2 leading-tight" title={item.title}>
          {item.title}
        </h3>
        {item.description && (
          <p className="text-zinc-400 text-xs line-clamp-1" title={item.description}>
            {item.description}
          </p>
        )}
      </div>
    </div>
  )
}
