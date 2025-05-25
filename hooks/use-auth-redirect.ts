"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

export function useAuthRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const redirectAttemptedRef = useRef(false)

  useEffect(() => {
    // Only set up the listener if we're in the browser
    if (typeof window === "undefined") return

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !redirectAttemptedRef.current) {
        // Redirect away from auth pages if already logged in
        if (pathname === "/login" || pathname === "/signup" || pathname === "/") {
          redirectAttemptedRef.current = true

          // Use window.location for reliable redirect
          window.location.href = "/dashboard"
        }
      } else if (!user) {
        // Reset the redirect flag when user is null
        redirectAttemptedRef.current = false
      }
    })

    return () => {
      unsubscribe()
    }
  }, [pathname, router])
}
