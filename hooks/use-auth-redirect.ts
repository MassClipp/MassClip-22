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
          router.push("/dashboard")
        }
      } else {
        console.log("User is not logged in")

        // Optional: Redirect to login if accessing protected pages
        // if (pathname.startsWith("/dashboard")) {
        //   router.push("/login")
        // }
      }
    })

    return () => {
      console.log("Cleaning up auth redirect listener")
      unsubscribe()
    }
  }, [pathname, router])
}
