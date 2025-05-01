"use client"

import { useUserPlan } from "@/hooks/use-user-plan"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface VideoWatermarkProps {
  className?: string
  position?: "bottom-right" | "top-right"
}

export function VideoWatermark({ className, position = "bottom-right" }: VideoWatermarkProps) {
  const { isProUser } = useUserPlan()
  const [mounted, setMounted] = useState(false)

  // Only show watermark after component is mounted to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything for pro users
  if (mounted && isProUser) {
    return null
  }

  return (
    <div
      className={cn(
        "absolute z-30 pointer-events-none select-none",
        position === "bottom-right" ? "bottom-4 right-4" : "top-4 right-4",
        "font-medium text-white/70 text-sm md:text-base backdrop-blur-sm px-2 py-1 rounded",
        "bg-black/30 shadow-sm",
        className,
      )}
      style={{
        textShadow: "0px 1px 2px rgba(0, 0, 0, 0.5)",
      }}
    >
      massclip.pro
    </div>
  )
}
