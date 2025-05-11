"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"

interface UpgradePromptProps {
  className?: string
  totalVideos?: number
}

export function UpgradePrompt({ className = "", totalVideos }: UpgradePromptProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    router.push("/pricing")
  }

  return (
    <div
      className={`p-6 rounded-lg bg-gradient-to-r from-rose-900/20 to-rose-800/20 border border-rose-800/30 ${className}`}
    >
      <div className="flex items-center mb-3">
        <Lock className="h-5 w-5 text-rose-400 mr-2" />
        <h3 className="text-lg font-medium text-rose-200">Unlock Full Access</h3>
      </div>

      <p className="text-sm text-zinc-300 mb-4">
        {totalVideos
          ? `Free users can only view 5 of ${totalVideos} videos in this category. Upgrade to Creator Pro for unlimited access.`
          : `Free users can only view 5 videos per category. Upgrade to Creator Pro for unlimited access to all videos.`}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleUpgrade} className="flex-1 bg-rose-700 hover:bg-rose-600 text-white">
          Upgrade to Creator Pro
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/categories")}
          className="flex-1 border-rose-800/50 hover:bg-rose-900/20 text-rose-200"
        >
          Browse Other Categories
        </Button>
      </div>
    </div>
  )
}
