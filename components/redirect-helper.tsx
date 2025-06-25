"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

export function RedirectHelper() {
  const { user, authChecked } = useFirebaseAuth()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect until auth state is checked
    if (!authChecked) return

    // Protected routes that require authentication
    const protectedRoutes = ["/dashboard", "/upload", "/profile", "/settings", "/subscription"]
    const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

    // If on a protected route and not authenticated, redirect to login
    if (isProtectedRoute && !user) {
      if (typeof window !== "undefined") {
        window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`
      }
    }

    // If on login/signup and already authenticated, redirect to dashboard
    if ((pathname === "/login" || pathname === "/signup") && user) {
      if (typeof window !== "undefined") {
        window.location.href = "/dashboard"
      }
    }
  }, [user, authChecked, pathname])

  return null
}
