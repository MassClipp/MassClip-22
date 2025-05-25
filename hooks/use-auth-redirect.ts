"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { auth } from "@/lib/firebase"

export function useAuthRedirect() {
  const pathname = usePathname()
  const redirectAttemptedRef = useRef(false)

  useEffect(() => {
    // Only run once on mount
    if (redirectAttemptedRef.current || typeof window === "undefined") return

    // Check if user is already logged in
    const currentUser = auth.currentUser

    if (currentUser) {
      // Only redirect from auth pages
      if (pathname === "/login" || pathname === "/signup" || pathname === "/") {
        redirectAttemptedRef.current = true
        window.location.href = "/dashboard"
      }
    }

    // No auth state listener to avoid loops
  }, [pathname])
}
