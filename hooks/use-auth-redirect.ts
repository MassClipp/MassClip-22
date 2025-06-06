"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { isAuthRoute, getRedirectUrl } from "@/lib/auth-utils"

interface UseAuthRedirectOptions {
  user: any | null
  loading: boolean
  redirectTo?: string
}

export function useAuthRedirect({ user, loading, redirectTo }: UseAuthRedirectOptions) {
  const router = useRouter()
  const hasRedirected = useRef(false)
  const currentPath = typeof window !== "undefined" ? window.location.pathname : ""

  useEffect(() => {
    // Don't redirect if still loading or already redirected
    if (loading || hasRedirected.current) return

    // If user is authenticated and on auth page, redirect to dashboard
    if (user && isAuthRoute(currentPath)) {
      hasRedirected.current = true
      const targetUrl = redirectTo || "/dashboard"
      console.log(`Authenticated user on auth page, redirecting to: ${targetUrl}`)
      router.replace(targetUrl)
      return
    }

    // If user is not authenticated and on protected route, redirect to login
    if (!user && !isAuthRoute(currentPath) && currentPath.startsWith("/dashboard")) {
      hasRedirected.current = true
      const loginUrl = getRedirectUrl(currentPath)
      console.log(`Unauthenticated user on protected route, redirecting to: ${loginUrl}`)
      router.replace(loginUrl)
      return
    }
  }, [user, loading, currentPath, redirectTo, router])

  return { hasRedirected: hasRedirected.current }
}
