"use client"

import { useEffect } from "react"

export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return

    // Save initial body style
    const originalStyle = window.getComputedStyle(document.body)
    const originalOverflow = originalStyle.overflow
    const originalPaddingRight = originalStyle.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    // Apply lock
    document.body.style.overflow = "hidden"
    document.body.style.paddingRight = `${scrollbarWidth}px`

    // iOS specific fix
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      const scrollY = window.scrollY
      document.body.style.position = "fixed"
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = "100%"
    }

    return () => {
      // Restore original style
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight

      // iOS specific restore
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        const scrollY = Number.parseInt(document.body.style.top || "0", 10) * -1
        document.body.style.position = ""
        document.body.style.top = ""
        document.body.style.width = ""
        window.scrollTo(0, scrollY)
      }
    }
  }, [lock])
}
