"use client"

interface VideoWatermarkProps {
  position?: "bottom-right" | "top-right"
  className?: string
}

export function VideoWatermark({ position = "bottom-right", className = "" }: VideoWatermarkProps) {
  // Always return null - watermarks are disabled
  return null
}
