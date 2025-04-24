"use client"

import { useEffect } from "react"

export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (lock) {
      // Save the current scroll position
      const scrollY = window.scrollY

      // Add the no-scroll class to the body
      document.body.classList.add("body-no-scroll")

      // Apply fixed positioning to maintain scroll position
      document.body.style.position = "fixed"
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = "100%"

      return () => {
        // Remove the no-scroll class
        document.body.classList.remove("body-no-scroll")

        // Restore the scroll position
        document.body.style.position = ""
        document.body.style.top = ""
        document.body.style.width = ""
        window.scrollTo(0, scrollY)
      }
    }
  }, [lock])
}
