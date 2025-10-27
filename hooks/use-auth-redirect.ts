"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/lib/firebase-safe"

export function useAuthRedirect() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? "User logged in" : "No user")
      setUser(user)
      setLoading(false)

      // Only redirect once and with a small delay to prevent loops
      if (user && !hasRedirected) {
        setHasRedirected(true)
        setTimeout(() => {
          console.log("Authenticated user detected, redirecting to dashboard")
          router.push("/dashboard")
        }, 100)
      }
    })

    return () => unsubscribe()
  }, [router, hasRedirected])

  return { user, loading, isAuthenticated: !!user }
}
