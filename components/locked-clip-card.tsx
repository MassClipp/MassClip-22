"use client"

import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LockedClipCardProps {
  thumbnailUrl?: string
}

export default function LockedClipCard({ thumbnailUrl }: LockedClipCardProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    router.push("/pricing")
  }

  return (
    <div className="flex-shrink-0 w-[160px]">
      <div
        className="relative premium-hover-effect"
        style={{
          position: "relative",
          paddingBottom: "177.78%", // 9:16 aspect ratio
          height: 0,
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {/* Background with blur effect */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : "none",
            backgroundColor: "#111",
            filter: "blur(4px)",
            opacity: 0.5,
          }}
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70" />

        {/* Lock content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
          <Lock className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-xs text-gray-300 mb-3">Locked – Upgrade to Pro to unlock full access</p>
          <Button
            onClick={handleUpgrade}
            size="sm"
            className="bg-crimson hover:bg-crimson-dark text-white text-xs px-4"
          >
            Upgrade
          </Button>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400 min-h-[2.5rem] line-clamp-2 font-light">
        <span className="inline-block mr-1">
          <Lock className="h-3 w-3 inline-block -mt-0.5" />
        </span>
        Premium Content
      </div>
    </div>
  )
}
