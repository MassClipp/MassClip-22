"use client"

import { X, Lock } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface BuilderModeBannerProps {
  onUpgrade?: () => void
}

export function BuilderModeBanner({ onUpgrade }: BuilderModeBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  if (dismissed) return null

  return (
    <div className="relative bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-lg p-4 mb-6">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-zinc-400 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4 pr-8">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Lock className="h-5 w-5 text-cyan-400" />
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-semibold text-white mb-1">Builder Mode Active</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Your storefront is in preview mode. Build your content library and customize everything, when you're ready
              to start earning, upgrade to go live and accept payments.
            </p>
          </div>

          <Button
            onClick={() => (onUpgrade ? onUpgrade() : router.push("/dashboard/upgrade"))}
            size="sm"
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
          >
            Upgrade to Go Live
          </Button>
        </div>
      </div>
    </div>
  )
}
