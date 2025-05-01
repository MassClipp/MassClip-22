"use client"

import { useUserPlan } from "@/hooks/use-user-plan"
import { useEffect } from "react"

export function ZoomPrevention() {
  const { isProUser, loading } = useUserPlan()

  useEffect(() => {
    if (loading) return

    // Only apply zoom prevention for free users
    if (!isProUser) {
      // 1. Set viewport meta tag with maximum-scale=1.0
      let viewportMeta = document.querySelector('meta[name="viewport"]')
      if (!viewportMeta) {
        viewportMeta = document.createElement("meta")
        viewportMeta.setAttribute("name", "viewport")
        document.head.appendChild(viewportMeta)
      }
      viewportMeta.setAttribute(
        "content",
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no",
      )

      // 2. Add CSS classes to prevent gesture-based zoom
      document.documentElement.classList.add("prevent-zoom")
      document.body.classList.add("prevent-zoom")

      // 3. Prevent pinch zoom using touch events
      const preventZoom = (e: TouchEvent) => {
        if (e.touches.length > 1) {
          e.preventDefault()
        }
      }

      // 4. Prevent double-tap zoom
      let lastTouchEnd = 0
      const preventDoubleTapZoom = (e: TouchEvent) => {
        const now = Date.now()
        if (now - lastTouchEnd < 300) {
          e.preventDefault()
        }
        lastTouchEnd = now
      }

      // 5. Prevent wheel zoom (for trackpads)
      const preventWheelZoom = (e: WheelEvent) => {
        if (e.ctrlKey) {
          e.preventDefault()
        }
      }

      // Add all event listeners
      document.addEventListener("touchstart", preventZoom, { passive: false })
      document.addEventListener("touchmove", preventZoom, { passive: false })
      document.addEventListener("touchend", preventDoubleTapZoom, { passive: false })
      document.addEventListener("wheel", preventWheelZoom, { passive: false })

      // 6. Add a style element with additional CSS
      const styleElement = document.createElement("style")
      styleElement.id = "zoom-prevention-styles"
      styleElement.textContent = `
        html, body {
          touch-action: pan-x pan-y !important;
          -ms-touch-action: pan-x pan-y !important;
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          overscroll-behavior: none !important;
          -ms-content-zooming: none !important;
          -webkit-text-size-adjust: 100% !important;
          -moz-text-size-adjust: 100% !important;
          text-size-adjust: 100% !important;
        }
        * {
          max-height: 100% !important;
        }
      `
      document.head.appendChild(styleElement)

      // Return cleanup function
      return () => {
        // Remove event listeners
        document.removeEventListener("touchstart", preventZoom)
        document.removeEventListener("touchmove", preventZoom)
        document.removeEventListener("touchend", preventDoubleTapZoom)
        document.removeEventListener("wheel", preventWheelZoom)

        // Remove style element
        const styleEl = document.getElementById("zoom-prevention-styles")
        if (styleEl) {
          styleEl.remove()
        }

        // Reset viewport meta
        if (viewportMeta) {
          viewportMeta.setAttribute("content", "width=device-width, initial-scale=1.0")
        }

        // Remove CSS classes
        document.documentElement.classList.remove("prevent-zoom")
        document.body.classList.remove("prevent-zoom")
      }
    }
  }, [isProUser, loading])

  // Add an early meta tag directly in the component's render output
  if (!loading && !isProUser) {
    return (
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no"
      />
    )
  }

  return null
}
