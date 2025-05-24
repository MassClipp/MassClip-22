"use client"

import { useState, useEffect } from "react"

/**
 * Hook to detect if the current device is a mobile device
 * @returns boolean indicating if the current device is mobile
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera

      // Regular expression for mobile devices
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

      // Check if screen width is less than 768px (typical mobile breakpoint)
      const isMobileWidth = window.innerWidth < 768

      setIsMobile(mobileRegex.test(userAgent) || isMobileWidth)
    }

    // Check on mount
    checkMobile()

    // Check on resize
    window.addEventListener("resize", checkMobile)

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return isMobile
}
