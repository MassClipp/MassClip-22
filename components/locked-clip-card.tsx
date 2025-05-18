"use client"

import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LockedClipCardProps {
  thumbnailUrl?: string
}

export function LockedClipCard({ thumbnailUrl }: LockedClipCardProps) {
  return (
    <div className="relative">
      <div
        className="aspect-[9/16] rounded-lg overflow-hidden relative"
        style={{
          backgroundImage: `url(${thumbnailUrl || "/placeholder.svg"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(8px)",
        }}
      >
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
          <Lock className="h-8 w-8 text-white/80 mb-3" />
          <p className="text-white text-xs text-center mb-3 font-medium">Premium Content</p>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs">
            Unlock
          </Button>
        </div>
      </div>
    </div>
  )
}

export default LockedClipCard
