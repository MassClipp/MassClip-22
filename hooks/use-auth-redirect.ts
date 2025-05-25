"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"

export function useAuthRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Enhanced logging
    const logRedirect = (message: string, data?: any) => {
      console.log(`[AUTH REDIRECT ${new Date().toISOString()}] ${message}`, data || "")
    }

    logRedirect("Setting up auth redirect hook")

    // Check if user is already logged in
    if (auth.currentUser) {
      logRedirect("User already logged in on hook mount", {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        currentPath: window.location.pathname,
      })

      // Only redirect if we're on the login page
      if (window.location.pathname === "/login") {
        logRedirect("Redirecting to dashboard from login page")
        router.push("/dashboard")
      }
    }

    // Set up auth state listener
    const unsubscribe = auth.onAuthStateChanged((user) => {
      logRedirect("Auth state changed in redirect hook", {
        user: user ? { uid: user.uid, email: user.email } : null,
        currentPath: window.location.pathname,
      })

      if (user && window.location.pathname === "/login") {
        logRedirect("User authenticated, redirecting to dashboard")

        // Try router.push first
        try {
          router.push("/dashboard")
        } catch (error) {
          logRedirect("Router.push failed, using window.location", { error })
          window.location.href = "/dashboard"
        }
      }
    })

    return () => {
      logRedirect("Cleaning up auth redirect hook")
      unsubscribe()
    }
  }, [router])
}
