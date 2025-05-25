"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

export function useAuthRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only set up the listener if we're in the browser
    if (typeof window === "undefined") return

    console.log("Setting up auth redirect listener")

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is logged in:", user.email)

        // Redirect away from auth pages if already logged in
        if (pathname === "/login" || pathname === "/signup" || pathname === "/") {
          console.log("Redirecting to dashboard")

          // Try router.push first
          try {
            router.push("/dashboard")

            // Fallback to window.location if router.push doesn't work
            setTimeout(() => {
              if (
                window.location.pathname === "/login" ||
                window.location.pathname === "/signup" ||
                window.location.pathname === "/"
              ) {
                console.log("Still on auth page, using window.location.href")
                window.location.href = "/dashboard"
              }
            }, 500)
          } catch (error) {
            console.error("Router push error:", error)
            window.location.href = "/dashboard"
          }
        }
      } else {
        console.log("User is not logged in")
      }
    })

    return () => {
      console.log("Cleaning up auth redirect listener")
      unsubscribe()
    }
  }, [pathname, router])
}
