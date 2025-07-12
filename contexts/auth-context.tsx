"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { type User, onAuthStateChanged, signOut as firebaseSignOut, signInWithCustomToken } from "firebase/auth"
import { auth } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionChecked, setSessionChecked] = useState(false)

  // Check for existing server session and restore Firebase auth
  const checkServerSession = useCallback(async () => {
    try {
      console.log("🔍 Checking server session...")
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          console.log("✅ Server session found for user:", data.user.uid)

          // If we have a server session but no Firebase user, try to restore
          if (!auth.currentUser) {
            console.log("🔄 Attempting to restore Firebase auth from server session...")

            // Try to get a custom token from the server to restore Firebase auth
            const tokenResponse = await fetch("/api/auth/get-custom-token", {
              method: "POST",
              credentials: "include",
            })

            if (tokenResponse.ok) {
              const tokenData = await tokenResponse.json()
              if (tokenData.customToken) {
                await signInWithCustomToken(auth, tokenData.customToken)
                console.log("✅ Firebase auth restored from server session")
              }
            }
          }
          return true
        }
      }

      console.log("❌ No valid server session found")
      return false
    } catch (error) {
      console.error("❌ Error checking server session:", error)
      return false
    }
  }, [])

  // Refresh authentication state
  const refreshAuth = useCallback(async () => {
    setLoading(true)
    await checkServerSession()
    setLoading(false)
  }, [checkServerSession])

  // Set up auth state listener and check server session
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const initializeAuth = async () => {
      console.log("🚀 Initializing unified auth system...")

      // First check for server session
      if (!sessionChecked) {
        await checkServerSession()
        setSessionChecked(true)
      }

      // Then set up Firebase auth listener
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        console.log("🔄 Firebase auth state changed:", currentUser ? "User logged in" : "No user")

        if (currentUser) {
          setUser(currentUser)

          // Ensure server session is set when Firebase user exists
          try {
            const idToken = await currentUser.getIdToken()
            await fetch("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
              credentials: "include",
            })
            console.log("✅ Server session synchronized with Firebase auth")
          } catch (error) {
            console.error("❌ Failed to sync server session:", error)
          }
        } else {
          setUser(null)

          // Clear server session when Firebase user is null
          try {
            await fetch("/api/auth/clear-session", {
              method: "POST",
              credentials: "include",
            })
            console.log("✅ Server session cleared")
          } catch (error) {
            console.error("❌ Failed to clear server session:", error)
          }
        }

        setLoading(false)
      })
    }

    initializeAuth()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [checkServerSession, sessionChecked])

  // Enhanced sign out that clears both Firebase and server sessions
  const signOut = async () => {
    try {
      setLoading(true)

      // Clear server session first
      await fetch("/api/auth/clear-session", {
        method: "POST",
        credentials: "include",
      })

      // Then sign out from Firebase
      await firebaseSignOut(auth)

      setUser(null)
      console.log("✅ User signed out from both Firebase and server")

      // Redirect to login
      window.location.href = "/login"
    } catch (error) {
      console.error("❌ Error signing out:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading,
    signOut,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Named export for compatibility
export const useAuthContext = useAuth
