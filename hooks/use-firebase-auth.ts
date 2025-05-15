"use client"

import { useState, useEffect } from "react"
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, isFirebaseConfigured, db } from "@/lib/firebase"

// Map Firebase error codes to generic user-friendly messages
const getGenericErrorMessage = (error: any): string => {
  const errorCode = error?.code || ""

  // Authentication errors
  if (errorCode.includes("auth/user-cancelled") || errorCode.includes("auth/popup-closed-by-user")) {
    return "Login cancelled. Please try again."
  }
  if (errorCode.includes("auth/account-exists-with-different-credential")) {
    return "An account already exists with the same email address but different sign-in credentials."
  }
  if (errorCode.includes("auth/invalid-email")) {
    return "Please enter a valid email address."
  }
  if (errorCode.includes("auth/user-disabled")) {
    return "This account has been disabled. Please contact support."
  }
  if (errorCode.includes("auth/user-not-found") || errorCode.includes("auth/wrong-password")) {
    return "Invalid email or password. Please try again."
  }
  if (errorCode.includes("auth/too-many-requests")) {
    return "Too many unsuccessful login attempts. Please try again later."
  }
  if (errorCode.includes("auth/email-already-in-use")) {
    return "An account with this email already exists."
  }
  if (errorCode.includes("auth/weak-password")) {
    return "Password is too weak. Please use a stronger password."
  }
  if (errorCode.includes("auth/popup-blocked")) {
    return "Login popup was blocked by your browser. Please allow popups for this site."
  }
  if (errorCode.includes("auth/network-request-failed")) {
    return "Network error. Please check your connection and try again."
  }
  if (errorCode.includes("auth/internal-error")) {
    return "An error occurred during authentication. Please try again."
  }

  // Default generic error
  return "Authentication error. Please try again."
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Listen for auth state changes
  useEffect(() => {
    // Skip if Firebase is not configured
    if (!isFirebaseConfigured) {
      console.warn("Authentication service is not properly configured. Auth functionality will be limited.")
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
        setError(getGenericErrorMessage(error))
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    if (!isFirebaseConfigured) {
      console.warn("Authentication service is not properly configured. Using demo mode.")
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
      const genericMessage = getGenericErrorMessage(err)
      setError(genericMessage)
      return { success: false, error: genericMessage }
    } finally {
      setLoading(false)
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      console.warn("Authentication service is not properly configured. Using demo mode.")
      setLoading(false)
      return { success: true, demo: true }
    }

    setError(null)
    try {
      setLoading(true)
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid))

      // If user doesn't exist in Firestore, create a new document
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date(),
          plan: "free",
          permissions: { download: false, premium: false },
        })
      }

      return { success: true }
    } catch (err) {
      console.error("Error signing in with Google:", err)
      const genericMessage = getGenericErrorMessage(err)
      setError(genericMessage)
      return { success: false, error: genericMessage }
    } finally {
      setLoading(false)
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    if (!isFirebaseConfigured) {
      console.warn("Authentication service is not properly configured. Using demo mode.")
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
      const genericMessage = getGenericErrorMessage(err)
      setError(genericMessage)
      return { success: false, error: genericMessage }
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const logOut = async () => {
    if (!isFirebaseConfigured) {
      console.warn("Authentication service is not properly configured. Using demo mode.")
      setUser(null)

      // Force redirect to login page
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }

      return { success: true, demo: true }
    }

    setError(null)
    try {
      await signOut(auth)

      // Force redirect to login page
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }

      return { success: true }
    } catch (err) {
      console.error("Error signing out:", err)
      const genericMessage = getGenericErrorMessage(err)
      setError(genericMessage)
      return { success: false, error: genericMessage }
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    if (!isFirebaseConfigured) {
      console.warn("Authentication service is not properly configured. Using demo mode.")
      return { success: true, demo: true }
    }

    setError(null)
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (err) {
      console.error("Error resetting password:", err)
      const genericMessage = getGenericErrorMessage(err)
      setError(genericMessage)
      return { success: false, error: genericMessage }
    }
  }

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    logOut,
    resetPassword,
    isFirebaseConfigured,
  }
}
