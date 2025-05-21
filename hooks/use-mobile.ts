"use client"

import { useState, useEffect } from "react"

/**
 * A hook that detects if the current device is a mobile device
 * @returns {boolean} True if the current device is a mobile device
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    // Function to check if the device is mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera

      // Regular expression for mobile devices
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

      // Check if screen width is less than 768px (common mobile breakpoint)
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
