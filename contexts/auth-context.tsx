"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { auth as firebaseAuth } from "@/lib/firebase" // adjust import if your firebase client lives elsewhere

type AuthContextValue = {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen for Firebase auth changes
    const unsub = firebaseAuth.onAuthStateChanged((u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

/**
 * Access the current authenticated user and loading flag.
 */
export function useAuthContext(): AuthContextValue {
  return useContext(AuthContext)
}
