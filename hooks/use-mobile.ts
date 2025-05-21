"use client"

import { useState, useEffect } from "react"

/**
 * A hook that detects if the current device is a mobile device
 * based on screen width or user agent.
 *
 * @returns {boolean} True if the current device is a mobile device
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    // Function to check if device is mobile
    const checkMobile = () => {
      // Check screen width first (most reliable for responsive design)
      const isMobileByWidth = window.innerWidth < 768

      // Optionally, also check user agent for mobile devices
      const isMobileByAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

      // Consider it mobile if either check passes
      setIsMobile(isMobileByWidth || isMobileByAgent)
    }

    // Check on mount
    checkMobile()

    // Add event listener for window resize
    window.addEventListener("resize", checkMobile)

    // Clean up
    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  return isMobile
}

export default useMobile
