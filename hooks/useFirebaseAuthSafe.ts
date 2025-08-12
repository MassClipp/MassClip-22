"use client"

import { useState, useEffect } from "react"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { auth, isFirebaseConfigured, firebaseError } from "@/lib/firebase-safe"

interface AuthResult {
  success: boolean
  error?: string
  demo?: boolean
}

export function useFirebaseAuthSafe() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setConfigError(firebaseError || "Firebase not configured")
      setLoading(false)
      return
    }

    if (!auth) {
      setConfigError("Firebase auth not initialized")
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("🔄 Auth state changed:", user?.email || "No user")
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signUp = async (
    email: string,
    password: string,
    username?: string,
    displayName?: string,
  ): Promise<AuthResult> => {
    if (!isFirebaseConfigured() || !auth) {
      return {
        success: false,
        error: "Firebase not configured",
        demo: true,
      }
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      console.log("✅ User created successfully:", result.user.email)

      // Call server-side user creation
      try {
        const response = await fetch("/api/auth/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uid: result.user.uid,
            email: result.user.email,
            username,
            displayName,
          }),
        })

        if (!response.ok) {
          console.warn("⚠️ Server-side user creation failed:", await response.text())
        } else {
          console.log("✅ Server-side user creation successful")
        }
      } catch (error) {
        console.error("❌ Server-side user creation error:", error)
      }

      return { success: true }
    } catch (error: any) {
      console.error("❌ Signup error:", error)
      return {
        success: false,
        error: error.message || "Failed to create account",
      }
    }
  }

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!isFirebaseConfigured() || !auth) {
      return {
        success: false,
        error: "Firebase not configured",
        demo: true,
      }
    }

    try {
      await signInWithEmailAndPassword(auth, email, password)
      return { success: true }
    } catch (error: any) {
      console.error("❌ Sign in error:", error)
      return {
        success: false,
        error: error.message || "Failed to sign in",
      }
    }
  }

  const signInWithGoogle = async (): Promise<AuthResult> => {
    if (!isFirebaseConfigured() || !auth) {
      return {
        success: false,
        error: "Firebase not configured",
        demo: true,
      }
    }

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope("email")
      provider.addScope("profile")

      const result = await signInWithPopup(auth, provider)

      // Call server-side user creation for Google users
      try {
        const response = await fetch("/api/auth/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
          }),
        })

        if (!response.ok) {
          console.warn("⚠️ Server-side user creation failed:", await response.text())
        } else {
          console.log("✅ Server-side user creation successful")
        }
      } catch (error) {
        console.error("❌ Server-side user creation error:", error)
      }

      return { success: true }
    } catch (error: any) {
      console.error("❌ Google sign in error:", error)
      return {
        success: false,
        error: error.message || "Failed to sign in with Google",
      }
    }
  }

  const logout = async (): Promise<AuthResult> => {
    if (!auth) {
      return { success: false, error: "Auth not initialized" }
    }

    try {
      await signOut(auth)
      return { success: true }
    } catch (error: any) {
      console.error("❌ Logout error:", error)
      return {
        success: false,
        error: error.message || "Failed to logout",
      }
    }
  }

  return {
    user,
    loading,
    configError,
    isConfigured: isFirebaseConfigured(),
    signUp,
    signIn,
    signInWithGoogle,
    logout,
  }
}
