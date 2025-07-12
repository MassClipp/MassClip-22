"use client"

import { useState, useEffect, useCallback } from "react"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  signInWithCustomToken,
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

  // Check for existing server session and restore Firebase auth
  const checkAndRestoreSession = useCallback(async () => {
    try {
      console.log("🔍 Checking for existing server session...")
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user && !auth?.currentUser) {
          console.log("🔄 Restoring Firebase auth from server session...")

          // Get custom token to restore Firebase auth
          const tokenResponse = await fetch("/api/auth/get-custom-token", {
            method: "POST",
            credentials: "include",
          })

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json()
            if (tokenData.customToken && auth) {
              await signInWithCustomToken(auth, tokenData.customToken)
              console.log("✅ Firebase auth restored successfully")
              return true
            }
          }
        }
      }
      return false
    } catch (error) {
      console.error("❌ Error restoring session:", error)
      return false
    }
  }, [])

  // Clear session cookie on the server
  const clearServerSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/clear-session", {
        method: "POST",
        credentials: "include",
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
        credentials: "include",
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

  // Set up auth state listener with session restoration
  useEffect(() => {
    if (!auth) {
      setConfigError("Firebase auth not initialized")
      setLoading(false)
      setAuthChecked(true)
      return
    }

    console.log("🚀 Setting up unified auth state listener")

    const initializeAuth = async () => {
      // First, try to restore from server session
      await checkAndRestoreSession()

      // Then set up the auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          console.log("✅ Auth state changed: User logged in")
          setUser(currentUser)

          // Ensure server session is synchronized
          await setServerSession(currentUser)
        } else {
          console.log("❌ Auth state changed: No user")
          setUser(null)

          // Clear server session when user logs out
          await clearServerSession()
        }

        setLoading(false)
        setAuthChecked(true)
      })

      return unsubscribe
    }

    let unsubscribe: (() => void) | undefined

    initializeAuth().then((unsub) => {
      unsubscribe = unsub
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [checkAndRestoreSession, setServerSession, clearServerSession])

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

  // Sign in with Google
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
      const userCredential = await signInWithPopup(auth, provider)
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

  // Refresh auth state
  const refreshAuth = useCallback(async () => {
    setLoading(true)
    await checkAndRestoreSession()
    setLoading(false)
  }, [checkAndRestoreSession])

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
    refreshAuth,
  }
}
