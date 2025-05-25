"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"

export function useAuthRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Only run once on mount
    const checkAuth = () => {
      if (auth.currentUser) {
        console.log("User already logged in in useAuthRedirect")

        // Only redirect if on login or signup page
        if (window.location.pathname === "/login" || window.location.pathname === "/signup") {
          window.location.href = "/dashboard"
        }
      }
    }

    // Check immediately
    checkAuth()

    // No auth state listener here to avoid conflicts
  }, [router])
}
