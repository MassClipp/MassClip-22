"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface UpgradePromptProps {
  className?: string
}

export function UpgradePrompt({ className = "" }: UpgradePromptProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    router.push("/pricing")
  }

  return (
    <div
      className={`p-4 rounded-lg bg-gradient-to-r from-rose-900/20 to-rose-800/20 border border-rose-800/30 ${className}`}
    >
      <h3 className="text-sm font-medium text-rose-200 mb-2">Unlock Full Access</h3>
      <p className="text-xs text-zinc-300 mb-3">
        Free users can only view 5 videos per category. Upgrade to Creator Pro for unlimited access to all videos.
      </p>
      <Button onClick={handleUpgrade} className="w-full bg-rose-800 hover:bg-rose-700 text-white text-xs py-1 px-3">
        Upgrade to Creator Pro
      </Button>
    </div>
  )
}
