"use client"

import { useState, useEffect } from "react"
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth"
import { auth, isFirebaseConfigured } from "@/lib/firebase"

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Listen for auth state changes
  useEffect(() => {
    // Skip if Firebase is not configured
    if (!isFirebaseConfigured) {
      console.warn("Firebase is not properly configured. Auth functionality will be limited.")
      setLoading(false)
      return () => {}
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (authUser) => {
        if (authUser) {
          setUser(authUser)
        } else {
          setUser(null)
        }
        setLoading(false)
      },
      (error) => {
        console.error("Auth state change error:", error)
        setError(error.message)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    if (!isFirebaseConfigured) {
      console.warn("Firebase is not properly configured. Using demo mode.")
      // Simulate successful login for demo/preview purposes
      setLoading(false)
      return { success: true, demo: true }
    }

    setError(null)
    try {
      setLoading(true)
      await signInWithEmailAndPassword(auth, email, password)
      return { success: true }
    } catch (err) {
      console.error("Error signing in:", err)
      setError(err instanceof Error ? err.message : "Failed to sign in")
      return { success: false, error: err instanceof Error ? err.message : "Failed to sign in" }
    } finally {
      setLoading(false)
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    if (!isFirebaseConfigured) {
      console.warn("Firebase is not properly configured. Using demo mode.")
      // Simulate successful signup for demo/preview purposes
      setLoading(false)
      return { success: true, demo: true }
    }

    setError(null)
    try {
      setLoading(true)
      await createUserWithEmailAndPassword(auth, email, password)
      return { success: true }
    } catch (err) {
      console.error("Error signing up:", err)
      setError(err instanceof Error ? err.message : "Failed to sign up")
      return { success: false, error: err instanceof Error ? err.message : "Failed to sign up" }
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const logOut = async () => {
    if (!isFirebaseConfigured) {
      console.warn("Firebase is not properly configured. Using demo mode.")
      setUser(null)
      return { success: true, demo: true }
    }

    setError(null)
    try {
      await signOut(auth)
      return { success: true }
    } catch (err) {
      console.error("Error signing out:", err)
      setError(err instanceof Error ? err.message : "Failed to sign out")
      return { success: false, error: err instanceof Error ? err.message : "Failed to sign out" }
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    if (!isFirebaseConfigured) {
      console.warn("Firebase is not properly configured. Using demo mode.")
      return { success: true, demo: true }
    }

    setError(null)
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (err) {
      console.error("Error resetting password:", err)
      setError(err instanceof Error ? err.message : "Failed to reset password")
      return { success: false, error: err instanceof Error ? err.message : "Failed to reset password" }
    }
  }

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    logOut,
    resetPassword,
    isFirebaseConfigured,
  }
}
