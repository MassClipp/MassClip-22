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
  user?: User | null
  error?: string
  demo?: boolean
}

interface UseFirebaseAuthSafeReturn {
  user: User | null
  loading: boolean
  isConfigured: boolean
  configError: string | null
  signUp: (email: string, password: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signInWithGoogle: () => Promise<AuthResult>
  logout: () => Promise<void>
}

export function useFirebaseAuthSafe(): UseFirebaseAuthSafeReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    if (!isFirebaseConfigured || !auth) {
      console.warn("Firebase not configured, returning demo mode")
      return {
        success: true,
        demo: true,
        error: "Firebase not configured - demo mode",
      }
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      console.log("✅ Firebase user created:", userCredential.user.uid)
      return {
        success: true,
        user: userCredential.user,
      }
    } catch (error: any) {
      console.error("❌ Firebase signup error:", error)
      return {
        success: false,
        error: error.message || "Failed to create account",
      }
    }
  }

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!isFirebaseConfigured || !auth) {
      return {
        success: true,
        demo: true,
        error: "Firebase not configured - demo mode",
      }
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      return {
        success: true,
        user: userCredential.user,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to sign in",
      }
    }
  }

  const signInWithGoogle = async (): Promise<AuthResult> => {
    if (!isFirebaseConfigured || !auth) {
      return {
        success: true,
        demo: true,
        error: "Firebase not configured - demo mode",
      }
    }

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope("email")
      provider.addScope("profile")

      const result = await signInWithPopup(auth, provider)
      console.log("✅ Google signup successful:", result.user.email)
      return {
        success: true,
        user: result.user,
      }
    } catch (error: any) {
      console.error("❌ Google signup error:", error)
      return {
        success: false,
        error: error.message || "Failed to sign in with Google",
      }
    }
  }

  const logout = async (): Promise<void> => {
    if (!auth) return

    try {
      await signOut(auth)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return {
    user,
    loading,
    isConfigured: isFirebaseConfigured,
    configError: firebaseError,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
  }
}
