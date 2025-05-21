"use client"

import { useState, useEffect } from "react"

/**
 * Custom hook to detect if the current device is a mobile device
 * @returns {boolean} True if the device is mobile, false otherwise
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i

      setIsMobile(mobileRegex.test(userAgent.toLowerCase()))
    }

    // Check on mount
    checkMobile()

    // Add resize listener to recheck if orientation changes
    window.addEventListener("resize", checkMobile)

    // Clean up
    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  return isMobile
}
