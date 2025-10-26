"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

interface AuthRedirectProps {
  to: string
  message?: string
}

export function AuthRedirect({ to, message = "Redirecting..." }: AuthRedirectProps) {
  const router = useRouter()
  const redirectAttemptedRef = useRef(false)
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (redirectAttemptedRef.current) return

    console.log("🔄 AuthRedirect: Attempting to redirect to:", to)
    redirectAttemptedRef.current = true

    // Try multiple redirect methods
    const attemptRedirect = async () => {
      try {
        // Method 1: router.replace
        router.replace(to)

        // Method 2: window.location (fallback after 2 seconds)
        fallbackTimerRef.current = setTimeout(() => {
          console.log("🔄 AuthRedirect: Fallback redirect via window.location")
          window.location.href = to
        }, 2000)
      } catch (error) {
        console.error("❌ Redirect error:", error)
        // Method 3: Force navigation
        window.location.href = to
      }
    }

    attemptRedirect()

    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
      }
    }
  }, [to, router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        {/* Minimal white spinner */}
        <div className="h-8 w-8 mx-auto mb-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <p className="text-white/60 text-sm mb-2">{message}</p>
        <p className="text-xs text-white/30">
          If you're not redirected,{" "}
          <a href={to} className="text-white/60 hover:text-white underline transition-colors">
            click here
          </a>
        </p>
      </div>
    </div>
  )
}
