"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isFirebaseConfigured } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    // If Firebase is not configured, allow access in preview/development mode
    if (!loading) {
      if (!isFirebaseConfigured) {
        console.warn("Firebase not configured. Allowing access in preview/development mode.")
        setIsAuthorized(true)
      } else if (user) {
        setIsAuthorized(true)
      } else {
        router.push("/login")
      }
    }
  }, [user, loading, router, isFirebaseConfigured])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}
