"use client"

import { useEffect } from "react"
import dynamic from "next/dynamic"

// Dynamically import the anti-fullscreen script with no SSR
const AntiFullscreenScript = dynamic(
  () =>
    import("@/app/anti-fullscreen").then((mod) => {
      // Return an empty component, the effect will handle execution
      return () => null
    }),
  { ssr: false },
)

export function AntiFullscreenClient() {
  useEffect(() => {
    // Import and execute the preventFullscreen function
    import("@/app/anti-fullscreen").then((mod) => {
      mod.preventFullscreen()
    })
  }, [])

  // Return the dynamically imported component (which is empty)
  return <AntiFullscreenScript />
}
