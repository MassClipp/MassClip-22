"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { type User, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth"
import { auth } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log("🔐 [Auth] Initializing auth context...")

    // Set persistence to LOCAL to survive redirects
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log("✅ [Auth] Persistence set to LOCAL - will survive redirects")
      })
      .catch((error) => {
        console.error("❌ [Auth] Failed to set persistence:", error)
        setError("Failed to set auth persistence")
      })

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        console.log("🔐 [Auth] State changed:", {
          user: user?.uid,
          email: user?.email,
          timestamp: new Date().toISOString(),
        })
        setUser(user)
        setLoading(false)
        setError(null)
      },
      (error) => {
        console.error("❌ [Auth] Auth state error:", error)
        setError(error.message)
        setLoading(false)
      },
    )

    return () => {
      console.log("🔐 [Auth] Cleaning up auth listener")
      unsubscribe()
    }
  }, [])

  const value = {
    user,
    loading,
    error,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
