"use client"

import { usePremiumAccess } from "@/hooks/use-premium-access"
import { CheckCircle } from "lucide-react"

interface PremiumAccessBannerProps {
  creatorId: string
  displayName: string
}

export default function PremiumAccessBanner({ creatorId, displayName }: PremiumAccessBannerProps) {
  const { hasAccess, isLoading } = usePremiumAccess(creatorId)

  if (isLoading || !hasAccess) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-lg p-3 mb-6 flex items-center gap-2">
      <CheckCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
      <p className="text-sm text-white">
        You have premium access to {displayName}'s content. Enjoy exclusive videos and more!
      </p>
    </div>
  )
}
