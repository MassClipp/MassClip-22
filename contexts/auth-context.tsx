"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth"
import { auth } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set persistence to LOCAL to survive redirects and page reloads
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log("🔧 [Auth] Persistence set to LOCAL - will survive redirects")
      })
      .catch((error) => {
        console.error("❌ [Auth] Failed to set persistence:", error)
      })

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("🔍 [Auth] State changed:", user ? `User: ${user.uid} (${user.email})` : "No user")
      setUser(user)
      setLoading(false)

      // Store auth state in localStorage for additional persistence
      if (user) {
        const authData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          timestamp: Date.now(),
        }
        localStorage.setItem("authUser", JSON.stringify(authData))
        console.log("💾 [Auth] User data stored in localStorage")
      } else {
        localStorage.removeItem("authUser")
        console.log("🗑️ [Auth] User data removed from localStorage")
      }
    })

    return () => unsubscribe()
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log("🔐 [Auth] Signing in with email...")
      const result = await signInWithEmailAndPassword(auth, email, password)
      console.log("✅ [Auth] Email sign-in successful:", result.user.uid)
    } catch (error: any) {
      console.error("❌ [Auth] Email sign-in failed:", error)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      console.log("🔐 [Auth] Signing in with Google...")
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: "select_account",
      })
      const result = await signInWithPopup(auth, provider)
      console.log("✅ [Auth] Google sign-in successful:", result.user.uid)
    } catch (error: any) {
      console.error("❌ [Auth] Google sign-in failed:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      console.log("🚪 [Auth] Signing out...")
      await signOut(auth)
      localStorage.removeItem("authUser")
      console.log("✅ [Auth] Sign-out successful")
    } catch (error: any) {
      console.error("❌ [Auth] Sign-out failed:", error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    signInWithEmail,
    signInWithGoogle,
    logout,
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

// Convenient alias used across the code-base
export const useAuthContext = useAuth
