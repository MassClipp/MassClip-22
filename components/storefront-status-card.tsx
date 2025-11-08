"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Activity, Lock } from "lucide-react"

interface StorefrontStatusCardProps {
  isLive: boolean
  isProUser: boolean
  className?: string
}

export function StorefrontStatusCard({ isLive, isProUser, className }: StorefrontStatusCardProps) {
  if (isProUser && isLive) {
    // Don't show card for live pro users
    return null
  }

  return (
    <Card className={`bg-zinc-900/40 border-zinc-800/50 ${className}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
              isLive ? "bg-green-500/10 border border-green-500/20" : "bg-zinc-800/50 border border-zinc-700/50"
            }`}
          >
            {isLive ? <Activity className="h-6 w-6 text-green-400" /> : <Lock className="h-6 w-6 text-zinc-400" />}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white">Storefront Status</h3>
              <Badge
                variant={isLive ? "default" : "secondary"}
                className={`text-xs ${
                  isLive
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-zinc-700 text-zinc-300 border-zinc-600"
                }`}
              >
                {isLive ? "Live" : "Builder Mode"}
              </Badge>
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed">
              {isLive
                ? "Your storefront is live and accepting payments"
                : "Build and preview your storefront. Upgrade to accept payments and go live."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
