"use client"

import { useState, useEffect } from "react"

/**
 * A hook that detects if the current device is a mobile device
 * @returns {boolean} True if the device is mobile, false otherwise
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i

      // Check if screen width is less than 768px (typical mobile breakpoint)
      const isMobileWidth = window.innerWidth < 768

      // Consider it mobile if either the user agent matches or the screen width is small
      setIsMobile(mobileRegex.test(userAgent.toLowerCase()) || isMobileWidth)
    }

    // Check on mount
    checkMobile()

    // Check on resize
    window.addEventListener("resize", checkMobile)

    // Clean up
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return isMobile
}

export default useMobile

// Export alias for backward compatibility
export const useIsMobile = useMobile
