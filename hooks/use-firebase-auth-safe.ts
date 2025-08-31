"use client"

import { useState, useEffect, useCallback } from "react"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInWithPopup,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { initializeFirebaseSafe } from "@/lib/firebase-safe"

// Initialize Firebase safely
const { auth, db, isConfigured } = initializeFirebaseSafe()

export function useFirebaseAuthSafe() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  // Clear session cookie on the server
  const clearServerSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        console.error("Failed to clear server session:", await response.text())
      }
    } catch (error) {
      console.error("Error clearing server session:", error)
    }
  }, [])

  // Set session cookie on the server
  const setServerSession = useCallback(async (user: User) => {
    try {
      // Get the ID token with force refresh to ensure it's up to date
      const idToken = await user.getIdToken(true)

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        console.error("Failed to set server session:", await response.text())
        return false
      }

      return true
    } catch (error) {
      console.error("Error setting server session:", error)
      return false
    }
  }, [])

  // Check if the user is authenticated on the server
  const validateServerSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/validate-session")
      const data = await response.json()
      return data.valid === true
    } catch (error) {
      console.error("Error validating server session:", error)
      return false
    }
  }, [])

  // Handle redirect result on page load
  useEffect(() => {
    if (!auth || !isConfigured) return

    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result) {
          console.log("Google redirect sign-in successful")
          await setServerSession(result.user)
        }
      } catch (error: any) {
        console.error("Redirect result error:", error)
        setConfigError(error.message)
      }
    }

    handleRedirectResult()
  }, [setServerSession])

  // Set up auth state listener
  useEffect(() => {
    if (!auth) {
      setConfigError("Firebase auth not initialized")
      setLoading(false)
      setAuthChecked(true)
      return
    }

    console.log("Setting up auth state listener")

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        console.log("Auth state changed: User logged in")

        // Set the user in state
        setUser(currentUser)

        // Ensure server session is set
        await setServerSession(currentUser)
      } else {
        console.log("Auth state changed: No user")
        setUser(null)

        // Clear server session when user logs out
        await clearServerSession()
      }

      setLoading(false)
      setAuthChecked(true)
    })

    return () => unsubscribe()
  }, [setServerSession, clearServerSession])

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    if (!auth || !isConfigured) {
      return { success: false, error: "Firebase not configured", demo: true }
    }

    try {
      setLoading(true)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      await setServerSession(userCredential.user)
      return { success: true }
    } catch (error: any) {
      console.error("Sign in error:", error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string, username: string, displayName: string) => {
    if (!auth || !db || !isConfigured) {
      return { success: false, error: "Firebase not configured", demo: true }
    }

    try {
      setLoading(true)

      // Check if username is already taken
      if (username) {
        const usernameDoc = await getDoc(doc(db, "usernames", username))
        if (usernameDoc.exists()) {
          return { success: false, error: "Username is already taken" }
        }
      }

      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Create user profile
      await setDoc(doc(db, "users", user.uid), {
        email,
        displayName: displayName || username,
        username,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Reserve username
      if (username) {
        await setDoc(doc(db, "usernames", username), {
          uid: user.uid,
          createdAt: serverTimestamp(),
        })
      }

      // Set server session
      await setServerSession(user)

      return { success: true }
    } catch (error: any) {
      console.error("Sign up error:", error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // Sign in with Google - using redirect instead of popup
  const signInWithGoogle = async (username?: string, displayName?: string) => {
    if (!auth || !db || !isConfigured) {
      return { success: false, error: "Firebase not configured", demo: true }
    }

    try {
      setLoading(true)

      // Check if username is already taken (for new users)
      if (username) {
        const usernameDoc = await getDoc(doc(db, "usernames", username))
        if (usernameDoc.exists()) {
          return { success: false, error: "Username is already taken" }
        }
      }

      const provider = new GoogleAuthProvider()
      provider.addScope("email")
      provider.addScope("profile")

      // Add custom parameters to avoid popup issues
      provider.setCustomParameters({
        prompt: "select_account",
      })

      let userCredential

      try {
        // Try popup first
        userCredential = await signInWithPopup(auth, provider)
      } catch (popupError: any) {
        console.log("Popup failed, trying redirect:", popupError.message)

        // If popup fails, use redirect
        await signInWithRedirect(auth, provider)
        return { success: true, redirect: true }
      }

      const user = userCredential.user

      // Check if this is a new user
      const userDoc = await getDoc(doc(db, "users", user.uid))

      if (!userDoc.exists() && username) {
        // Create user profile for new users
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          displayName: displayName || username || user.displayName,
          username,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })

        // Reserve username
        await setDoc(doc(db, "usernames", username), {
          uid: user.uid,
          createdAt: serverTimestamp(),
        })
      }

      // Set server session
      await setServerSession(user)

      return { success: true }
    } catch (error: any) {
      console.error("Google sign in error:", error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // Log out
  const logOut = async () => {
    if (!auth) {
      return { success: false, error: "Firebase not configured", demo: true }
    }

    try {
      setLoading(true)

      // Clear server session first
      await clearServerSession()

      // Then sign out from Firebase
      await signOut(auth)

      // Force reload the page to clear any cached state
      window.location.href = "/login"

      return { success: true }
    } catch (error: any) {
      console.error("Log out error:", error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    if (!auth || !isConfigured) {
      return { success: false, error: "Firebase not configured", demo: true }
    }

    try {
      setLoading(true)
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (error: any) {
      console.error("Reset password error:", error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    authChecked,
    signIn,
    signUp,
    signInWithGoogle,
    logOut,
    resetPassword,
    configError,
    isConfigured,
  }
}

export const useAuth = useFirebaseAuthSafe
