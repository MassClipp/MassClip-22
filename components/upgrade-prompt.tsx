"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"

interface UpgradePromptProps {
  className?: string
  totalCount?: number
}

export function UpgradePrompt({ className = "", totalCount }: UpgradePromptProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    router.push("/pricing")
  }

  return (
    <div
      className={`p-4 rounded-lg bg-gradient-to-r from-rose-900/20 to-rose-800/20 border border-rose-800/30 ${className}`}
    >
      <div className="flex items-center mb-2">
        <Lock className="h-5 w-5 text-rose-400 mr-2" />
        <h3 className="text-base font-medium text-rose-200">Unlock Full Access</h3>
      </div>

      <p className="text-sm text-zinc-300 mb-3">
        {totalCount
          ? `Free users can only view 5 of ${totalCount} videos in this category. Upgrade to Creator Pro for unlimited access.`
          : `Free users can only view 5 videos per category. Upgrade to Creator Pro for unlimited access to all videos.`}
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleUpgrade} className="flex-1 bg-rose-700 hover:bg-rose-600 text-white text-sm">
          Upgrade to Creator Pro
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/categories")}
          className="flex-1 border-rose-800/50 hover:bg-rose-900/20 text-rose-200 text-sm"
        >
          Browse Other Categories
        </Button>
      </div>
    </div>
  )
}
