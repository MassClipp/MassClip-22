"use client"

import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LockedClipCard() {
  const router = useRouter()

  return (
    <div className="flex-shrink-0 w-[160px]">
      <div
        className="relative"
        style={{
          position: "relative",
          paddingBottom: "177.78%", // 9:16 aspect ratio
          height: 0,
          borderRadius: "8px",
          overflow: "hidden",
          background: "linear-gradient(to bottom, #1a1a1a, #0a0a0a)",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-3 text-center">
          <Lock className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-xs text-gray-300 mb-3">Locked – Upgrade to Pro</p>
          <Button
            onClick={() => router.push("/pricing")}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white text-xs px-4"
          >
            Upgrade
          </Button>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400 min-h-[2.5rem] line-clamp-2 font-light">Premium Content</div>
    </div>
  )
}
